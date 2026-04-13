from __future__ import annotations

import pytest


def test_validate_upload_rows_accepts_tolerance_percent_header() -> None:
    """PO templates may use a human header `Tolerance %`.

    The uploader should accept it without treating it as an unexpected extra column
    after converting to the internal format.
    """

    from jin.uploader import validate_upload_rows

    rows = [
        {
            "retailer": "amazon",
            "label": "current",
            "api_version": "0.1.0",
            "date": "2026-03-19",
            "revenue": "4712.9",
            "orders": "100",
            "Tolerance %": "10",
        }
    ]
    dim_fields = ["retailer", "data[].label", "data[].api_version", "data[].date"]
    kpi_fields = ["data[].revenue", "data[].orders"]
    field_names = set(dim_fields + kpi_fields)

    dims, kpis, normalized, warnings = validate_upload_rows(
        rows,
        field_names,
        expected_fields=None,
        endpoint="/api/revenue/{retailer}",
        dimension_fields=dim_fields,
        kpi_fields=kpi_fields,
    )

    assert dims == dim_fields
    assert kpis == kpi_fields
    assert len(normalized) == 1
    assert normalized[0]["tolerance_pct"] == pytest.approx(10.0)
    assert warnings == []

