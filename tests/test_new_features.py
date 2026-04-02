import json
import os
import tempfile
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from jin import JinMiddleware, Metric, Dimension, Sum


class Order(BaseModel):
    region: str
    amount: float


@pytest.fixture
def app_with_jin():
    """App fixture with a unique temporary DuckDB per test."""
    db_fd, db_path = tempfile.mkstemp(suffix=".duckdb")
    os.close(db_fd)
    os.remove(db_path)

    app = FastAPI(version="1.0.0")
    
    # Global patch for license check during tests
    with patch("jin.middleware.LicenseClient.check_usage", return_value=True):
        app.add_middleware(
            JinMiddleware,
            db_path=db_path,
            log_level="DEBUG",
        )

        @app.post("/api/orders", response_model=Order)
        def create_order(order: Order):
            return order

        create_order._jin_metrics = [
            Metric(name="revenue", calculation=Sum("amount"), dimensions=[Dimension("region")])
        ]

        yield app, db_path

    # Cleanup connections
    from jin.middleware import _connections
    if db_path in _connections:
        try:
            _connections[db_path][0].close()
        except Exception:
            pass
        del _connections[db_path]
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Metric definition and rollup population
# ---------------------------------------------------------------------------

def test_metrics_discovery_and_query_flow(app_with_jin):
    """An observation fires, populates jin_rollups, and the query API responds."""
    app, db_path = app_with_jin
    client = TestClient(app)

    # Trigger discovery and an observation
    response = client.post("/api/orders", json={"amount": 200.0, "region": "EU"})
    assert response.status_code == 200

    # Verify rollup data through the query API endpoint
    response = client.post(
        "/jin/api/v1/query",
        json={"measures": ["amount"], "dimensions": ["region"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert len(body["data"]) >= 1


# ---------------------------------------------------------------------------
# api_version telemetry
# ---------------------------------------------------------------------------

def test_api_version_tagged_in_grain_key(app_with_jin):
    """api_version is extracted from X-API-Version header and stored in the grain."""
    app, _ = app_with_jin
    client = TestClient(app)

    # Submit with explicit API version header
    response = client.post(
        "/api/orders",
        json={"amount": 99.0, "region": "US"},
        headers={"X-API-Version": "v2"},
    )
    assert response.status_code == 200

    query_response = client.post(
        "/jin/api/v1/query",
        json={"measures": ["amount"], "dimensions": ["api_version"]},
    )
    assert query_response.status_code == 200
    data = query_response.json().get("data", [])
    grain_keys = [row.get("grain_key", "") for row in data]
    assert any("api_version=v2" in gk for gk in grain_keys)


def test_api_version_defaults_to_app_version(app_with_jin):
    """When no X-API-Version header is sent, the app version is used instead."""
    app, _ = app_with_jin
    client = TestClient(app)

    response = client.post("/api/orders", json={"amount": 50.0, "region": "CA"})
    assert response.status_code == 200

    query_response = client.post(
        "/jin/api/v1/query",
        json={"measures": ["amount"], "dimensions": ["api_version"]},
    )
    assert query_response.status_code == 200
    data = query_response.json().get("data", [])
    grain_keys = [row.get("grain_key", "") for row in data]
    assert any("api_version=1.0.0" in gk for gk in grain_keys)


# ---------------------------------------------------------------------------
# Upload preview: format errors return non-punishing messages
# ---------------------------------------------------------------------------

def test_upload_preview_internal_format_missing_required_meta_columns(app_with_jin):
    """Internal-format CSV missing endpoint/dimension_fields/kpi_fields returns 422."""
    app, _ = app_with_jin
    client = TestClient(app)

    client.post("/api/orders", json={"amount": 10.0, "region": "US"})

    # Internal format (has endpoint col) but missing kpi_fields
    csv_content = b"endpoint,dimension_fields\n/api/orders,region\n"
    response = client.post(
        "/jin/api/upload-preview/api%2Forders",
        files={"file": ("test.csv", csv_content)},
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert "Missing" in error


def test_upload_preview_po_format_missing_dimension_column(app_with_jin):
    """PO-format CSV missing a dimension column returns 422 with a clear message."""
    app, _ = app_with_jin
    client = TestClient(app)

    client.post("/api/orders", json={"amount": 10.0, "region": "US"})

    # PO format: missing region (mystery_column does not match region fuzzily)
    csv_content = b"mystery_column,amount\nUS,100\n"
    response = client.post(
        "/jin/api/upload-preview/api%2Forders",
        files={"file": ("test.csv", csv_content)},
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert "region" in error or "Missing" in error


def test_upload_po_omitting_technical_metadata(app_with_jin):
    """PO-format CSV omitting api_version (technical metadata) is accepted."""
    app, _ = app_with_jin
    client = TestClient(app)

    # Endpoint that has api_version in dims (all do)
    client.post("/api/orders", json={"amount": 10.0, "region": "US"})

    # PO format: NO api_version column, only business fields
    csv_content = b"region,amount\nUS,100\n"
    response = client.post(
        "/jin/api/upload-preview/api%2Forders",
        files={"file": ("test.csv", csv_content)},
    )
    assert response.status_code == 200
    payload = response.json()
    assert set(payload["groups_detected"]) == {"api_version", "region"}
    # Check that the first sample row has the injected api_version in the group string
    group_str = payload["sample_rows"][0]["group"]
    assert "api_version=" in group_str


def test_upload_preview_po_format_unknown_kpi_field(app_with_jin):
    """Internal-format CSV referencing an unknown kpi_field returns 422."""
    app, _ = app_with_jin
    client = TestClient(app)

    client.post("/api/orders", json={"amount": 10.0, "region": "US"})

    csv_content = (
        b"endpoint,dimension_fields,kpi_fields,tolerance_pct,"
        b"grain_region,expected_wrong_metric\n"
        b"/api/orders,region,wrong_metric,10,US,100\n"
    )
    response = client.post(
        "/jin/api/upload-preview/api%2Forders",
        files={"file": ("test.csv", csv_content)},
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert "wrong_metric" in error or "Unknown" in error


# ---------------------------------------------------------------------------
# Uploader unit logic
# ---------------------------------------------------------------------------

def test_uploader_unit_logic():
    from jin.uploader import parse_csv_upload, validate_upload_rows

    csv_content = b"a,b\n1,2"
    rows = parse_csv_upload(csv_content)
    assert rows == [{"a": "1", "b": "2"}]

    with pytest.raises(ValueError, match="Empty file"):
        validate_upload_rows([], set())

    with pytest.raises(ValueError, match=r"Unknown field in upload"):
        rows = [
            {
                "endpoint": "/x",
                "dimension_fields": "extra",
                "kpi_fields": "val",
                "grain_extra": "1",
                "expected_val": "2",
                "tolerance_pct": "10",
            }
        ]
        validate_upload_rows(rows, {"val"})
