from __future__ import annotations

import pytest


def test_validate_upload_rows_accepts_group_column_format() -> None:
    """POs may upload a single `Group` column instead of separate dimension columns."""

    from jin.uploader import validate_upload_rows

    dim_fields = ["retailer", "data[].label", "data[].api_version", "data[].date"]
    kpi_fields = ["data[].revenue", "data[].orders"]
    field_names = set(dim_fields + kpi_fields)

    rows = [
        {
            "Group": "retailer=amazon | label=current | api_version=0.1.0 | date=2026-03-19",
            "revenue": "6000.0",
            "orders": "100",
            "Tolerance %": "10",
        }
    ]

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
    assert normalized[0]["dimensions"]["retailer"] == "amazon"
    assert normalized[0]["dimensions"]["data[].label"] == "current"
    assert normalized[0]["dimensions"]["data[].api_version"] == "0.1.0"
    assert normalized[0]["dimensions"]["data[].date"] == "2026-03-19"
    assert normalized[0]["expected"]["data[].revenue"] == pytest.approx(6000.0)
    assert normalized[0]["expected"]["data[].orders"] == pytest.approx(100.0)
    assert warnings == []


def test_group_column_requires_key_value_pairs() -> None:
    from jin.uploader import validate_upload_rows

    dim_fields = ["retailer"]
    kpi_fields = ["amount"]
    field_names = set(dim_fields + kpi_fields)

    rows = [
        {
            "Group": "retailer amazon",
            "amount": "10",
            "tolerance_pct": "10",
        }
    ]

    with pytest.raises(ValueError, match=r"Invalid Group format"):
        validate_upload_rows(
            rows,
            field_names,
            expected_fields=None,
            endpoint="/api/orders",
            dimension_fields=dim_fields,
            kpi_fields=kpi_fields,
        )

