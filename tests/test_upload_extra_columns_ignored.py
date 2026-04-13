from __future__ import annotations


def test_validate_upload_rows_ignores_extra_columns_with_warning() -> None:
    from jin.uploader import expected_upload_columns, validate_upload_rows

    dims = ["retailer", "data[].date"]
    kpis = ["data[].revenue"]
    expected = expected_upload_columns(dims, kpis)

    rows = [
        {
            "endpoint": "/api/revenue/{retailer}",
            "dimension_fields": ",".join(dims),
            "kpi_fields": ",".join(kpis),
            "grain_retailer": "amazon",
            "grain_data[].date": "2026-04-13",
            "expected_data[].revenue": "4951.3",
            "tolerance_pct": "10",
            # Extra column that should not hard-fail.
            "label": "current",
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
    assert any("Ignored extra column" in str(w) for w in warnings)

