from __future__ import annotations

from urllib.parse import quote


def test_save_config_promotes_time_field_into_dimension_fields(client) -> None:
    # Create at least one request so Jin has the endpoint registered.
    resp = client.get("/api/sales/amazon/2026-04-13?value=100")
    assert resp.status_code == 200

    endpoint_path = "/api/sales/{retailer}/{period}"
    encoded = quote(endpoint_path, safe="")

    # Save a config that sets a time_field but omits it from dimension_fields.
    save = client.post(
        f"/jin/api/v2/config/{encoded}",
        json={
            "dimension_fields": ["retailer"],
            "kpi_fields": ["data.RSV", "data.units"],
            "time_field": "period",
            "rows_path": "data",
            "tolerance_pct": 10.0,
            "confirmed": True,
        },
    )
    assert save.status_code == 200, save.text

    detail = client.get(f"/jin/api/v2/endpoint/{encoded}")
    assert detail.status_code == 200
    payload = detail.json()
    dims = payload.get("config", {}).get("dimension_fields") or []
    assert "period" in dims

