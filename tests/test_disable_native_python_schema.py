from __future__ import annotations


def test_disable_native_env_initializes_python_schema(tmp_path, monkeypatch) -> None:
    """When JIN_DISABLE_NATIVE=1, Jin must still create the DB schema.

    We avoid module reloads here because they can leak mutated native-symbol globals
    into other tests in the same process.
    """

    monkeypatch.setenv("JIN_DISABLE_NATIVE", "1")

    import jin.middleware as middleware
    from fastapi import FastAPI

    # Simulate native being unavailable in-process (what happens on Windows/no-wheel).
    original_init_db = middleware.init_db
    middleware.init_db = None
    try:
        app = FastAPI()
        db_path = tmp_path / "python-only.duckdb"
        jin = middleware.JinMiddleware(app, db_path=str(db_path), global_threshold=10.0)
        jin._init_db_if_needed()

        import duckdb

        conn = duckdb.connect(str(db_path))
        try:
            conn.execute("SELECT COUNT(*) FROM jin_reference").fetchone()
            conn.execute("SELECT COUNT(*) FROM jin_anomalies").fetchone()
            conn.execute("SELECT COUNT(*) FROM jin_config").fetchone()
            conn.execute("SELECT COUNT(*) FROM jin_endpoints").fetchone()
        finally:
            conn.close()
    finally:
        middleware.init_db = original_init_db
