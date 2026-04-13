from __future__ import annotations


def test_internal_format_backfills_leaf_columns_into_grain_columns() -> None:
    """If a user uploads internal meta-columns but uses leaf headers, Jin should map them."""

    from jin.uploader import expected_upload_columns, validate_upload_rows

    dims = ["retailer", "date"]
    kpis = ["revenue", "orders"]
    expected = expected_upload_columns(dims, kpis)

    rows = [
        {
            "endpoint": "/api/revenue/{retailer}",
            "dimension_fields": ",".join(dims),
            "kpi_fields": ",".join(kpis),
            # Leaf columns (user-edited template)
            "retailer": "amazon",
            "date": "2026-04-13",
            "revenue": "4951.3",
            "orders": "103",
            "tolerance_pct": "1",
        }
    ]

    dim_fields, kpi_fields, normalized, warnings = validate_upload_rows(
        rows,
        set(dims + kpis),
        expected_fields=expected,
        endpoint="/api/revenue/{retailer}",
        dimension_fields=dims,
        kpi_fields=kpis,
    )

    assert dim_fields == dims
    assert kpi_fields == kpis
    assert len(normalized) == 1
    assert any("Mapped column" in str(w) for w in warnings)

