from __future__ import annotations

import pytest

from jin.uploader import _looks_like_time, _parse_group_cell, validate_upload_rows


def test_parse_group_cell_accepts_none_and_empty() -> None:
    assert _parse_group_cell(None, row_index=2) == {}
    assert _parse_group_cell("", row_index=2) == {}
    assert _parse_group_cell("   ", row_index=2) == {}


def test_parse_group_cell_errors_on_invalid_pairs() -> None:
    with pytest.raises(ValueError, match="Expected `key=value`"):
        _parse_group_cell("retailer", row_index=2)
    with pytest.raises(ValueError, match="Missing key"):
        _parse_group_cell("=amazon", row_index=2)


def test_looks_like_time_detects_iso_and_epoch() -> None:
    assert _looks_like_time("anything", "2026-04-01")
    assert _looks_like_time("anything", "1712345678")
    assert _looks_like_time("anything", "1712345678123")
    assert _looks_like_time("anything", None) is False


def test_validate_upload_rows_backfills_expected_field_aliases() -> None:
    # Internal-format row (includes meta columns) but user edited leaf-based columns.
    rows = [
        {
            "endpoint": "/api/revenue/{retailer}",
            "dimension_fields": "retailer,data[].date",
            "kpi_fields": "data[].revenue",
            "grain_retailer": "amazon",
            # User used leaf column name, but template/config expects `grain_data[].date`.
            "grain_date": "2026-04-13",
            # Same drift pattern for KPI.
            "expected_revenue": "10.0",
            "tolerance_pct": "5",
        }
    ]
    field_names = {"retailer", "data[].date", "data[].revenue"}
    expected_fields = [
        "endpoint",
        "dimension_fields",
        "kpi_fields",
        "grain_retailer",
        "grain_data[].date",
        "expected_data[].revenue",
        "tolerance_pct",
    ]

    dims, kpis, normalized, warnings = validate_upload_rows(
        rows,
        field_names,
        expected_fields=expected_fields,
        endpoint="/api/revenue/{retailer}",
        dimension_fields=["retailer", "data[].date"],
        kpi_fields=["data[].revenue"],
    )
    assert "data[].date" in dims
    assert "data[].revenue" in kpis
    assert normalized[0]["dimensions"]["data[].date"] == "2026-04-13"
    assert normalized[0]["expected"]["data[].revenue"] == 10.0
    # Ensure the alias backfill path ran (warn text is stable enough for tests).
    assert any("Mapped column" in w and "grain_data[].date" in w for w in warnings)
    assert any("Mapped column" in w and "expected_data[].revenue" in w for w in warnings)

