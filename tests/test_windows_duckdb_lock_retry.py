from __future__ import annotations


def test_native_init_db_retries_on_windows_file_lock(tmp_path, monkeypatch) -> None:
    import jin.middleware as middleware
    from fastapi import FastAPI

    monkeypatch.setattr(middleware.platform, "system", lambda: "Windows")

    sleep_calls: list[float] = []
    monkeypatch.setattr(middleware.time, "sleep", lambda seconds: sleep_calls.append(float(seconds)))

    calls = {"count": 0}

    def flaky_init_db(_db_path: str) -> None:
        calls["count"] += 1
        if calls["count"] < 3:
            raise RuntimeError(
                "IO Error: cannot open file \"./jin.duckdb\": The process cannot access the file because it is used by another process"
            )

    original_init_db = middleware.init_db
    middleware.init_db = flaky_init_db
    try:
        app = FastAPI()
        jin = middleware.JinMiddleware(app, db_path=str(tmp_path / "locked.duckdb"))
        jin._init_db_if_needed()
        assert jin._initialized is True
        assert calls["count"] == 3
        assert len(sleep_calls) == 2
    finally:
        middleware.init_db = original_init_db


def test_get_connection_retries_on_windows_file_lock(tmp_path, monkeypatch) -> None:
    import duckdb
    import jin.middleware as middleware
    from fastapi import FastAPI

    monkeypatch.setattr(middleware.platform, "system", lambda: "Windows")

    sleep_calls: list[float] = []
    monkeypatch.setattr(middleware.time, "sleep", lambda seconds: sleep_calls.append(float(seconds)))

    original_connect = duckdb.connect
    calls = {"count": 0}

    def flaky_connect(*args, **kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError(
                "IO Error: cannot open file \"./jin.duckdb\": The process cannot access the file because it is used by another process"
            )
        return original_connect(*args, **kwargs)

    monkeypatch.setattr(duckdb, "connect", flaky_connect)

    app = FastAPI()
    db_path = tmp_path / "retry.duckdb"
    jin = middleware.JinMiddleware(app, db_path=str(db_path))

    conn, lock = jin._get_connection()
    assert conn is not None
    with lock:
        assert conn.execute("SELECT 1").fetchone() == (1,)
    assert calls["count"] == 2
    assert len(sleep_calls) == 1

