from __future__ import annotations


def test_upload_time_promotion_prefers_api_field_name_over_leaf() -> None:
    """If an API time field is `data[].date` but the CSV uses leaf header `date`,
    we should promote `data[].date` (not `date`) and backfill `grain_data[].date`.
    """

    from jin.uploader import expected_upload_columns, validate_upload_rows

    endpoint = "/api/revenue/{retailer}"
    dims = ["retailer", "data[].label", "api_version"]
    kpis = ["data[].revenue", "data[].orders"]

    # The API schema includes `data[].date` but it's not in config dimension_fields
    # (it is commonly configured as `time_field` instead).
    field_names = set([*dims, *kpis, "data[].date"])

    expected = expected_upload_columns(dims, kpis)

    rows = [
        {
            # PO-friendly simple template format (no internal meta-columns).
            "retailer": "amazon",
            "label": "current",
            "date": "2026-04-13",
            "revenue": "4951.3",
            "orders": "103",
            "tolerance_pct": "1",
        }
    ]

    dim_fields, _kpi_fields, normalized, warnings = validate_upload_rows(
        rows,
        field_names,
        expected_fields=expected,
        endpoint=endpoint,
        dimension_fields=dims,
        kpi_fields=kpis,
        technical_defaults={"api_version": "0.1.0"},
    )

    assert "data[].date" in dim_fields
    assert "date" not in dim_fields
    assert normalized[0]["dimensions"]["data[].date"] == "2026-04-13"
    assert any("Auto-promoted" in str(w) for w in warnings)

