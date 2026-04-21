from __future__ import annotations


def test_add_middleware_mounts_jin_router_immediately(tmp_path) -> None:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from jin.middleware import JinMiddleware

    app = FastAPI()
    app.add_middleware(JinMiddleware, db_path=str(tmp_path / "jin.duckdb"))

    with TestClient(app) as client:
        # Ensure startup ran.
        _ = client.get("/openapi.json")

    paths = {getattr(route, "path", None) for route in app.routes}
    assert "/jin" in paths
