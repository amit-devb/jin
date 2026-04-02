from __future__ import annotations

from datetime import date, datetime, timezone

from jin.time_mapping import (
    _as_datetime,
    _parse_profile_value,
    _parse_quarter,
    _parse_token,
    _parse_year,
    _parse_year_month,
    _parse_year_week,
    _resolve_path_collection,
    _resolve_path_value,
    extract_rows,
    normalize_rows,
    preview_time_mapping,
)


def test_extract_rows_uses_rows_path_for_nested_payload() -> None:
    payload = {
        "data": [
            {"retailer": "amazon", "period_week": "2025-W13", "orders": 10},
            {"retailer": "walmart", "period_week": "2025-W14", "orders": 12},
        ]
    }
    rows, source = extract_rows(payload, rows_path="data[]", default_array_path=None)
    assert source == "rows_path"
    assert len(rows) == 2
    assert rows[0]["retailer"] == "amazon"


def test_preview_time_mapping_parses_year_week_profile() -> None:
    rows = [
        {"period_week": "2025-W13"},
        {"period_week": "2025-W14"},
    ]
    result = preview_time_mapping(
        rows=rows,
        time_field="period_week",
        time_profile="year_week",
        time_extraction_rule="single",
        sample_rows_limit=5,
    )
    assert result["sample_count"] == 2
    assert result["summary"]["success_count"] == 2
    assert result["summary"]["failure_count"] == 0
    assert result["summary"]["detected_granularity"] == "week"
    assert result["parsed_rows"][0]["time_start"] is not None


def test_preview_time_mapping_parses_token_with_warning() -> None:
    rows = [{"period": "YTD"}]
    result = preview_time_mapping(
        rows=rows,
        time_field="period",
        time_profile="token",
        time_extraction_rule="single",
        sample_rows_limit=3,
    )
    assert result["summary"]["success_count"] == 1
    assert result["summary"]["warning_count"] >= 1
    assert result["parsed_rows"][0]["status"] == "warning"


def test_normalize_rows_and_extract_rows_cover_payload_shapes() -> None:
    assert normalize_rows(None) == []
    assert normalize_rows({"a": 1}) == [{"a": 1}]
    assert normalize_rows([{"a": 1}, 2]) == [{"a": 1}, {"value": 2}]
    assert normalize_rows("scalar") == [{"value": "scalar"}]

    rows, source = extract_rows([{"a": 1}], rows_path=None, default_array_path=None)
    assert source == "payload_list"
    assert rows == [{"a": 1}]

    payload = {"items": [{"x": 1}, {"x": 2}], "other": "v"}
    rows, source = extract_rows(payload, rows_path=None, default_array_path="items[]")
    assert source == "default_array_path"
    assert rows == [{"x": 1}, {"x": 2}]

    rows, source = extract_rows({"root": "v"}, rows_path=None, default_array_path=None)
    assert source == "payload_object"
    assert rows == [{"root": "v"}]

    rows, source = extract_rows({"first": [{"k": "v"}]}, rows_path=None, default_array_path=None)
    assert source == "first_object_list"
    assert rows == [{"k": "v"}]

    rows, source = extract_rows("raw-value", rows_path=None, default_array_path="items[]")
    assert source == "scalar_payload"
    assert rows == [{"value": "raw-value"}]

    rows, source = extract_rows({"items": []}, rows_path=None, default_array_path="items[]")
    assert source == "payload_object"
    assert rows == [{"items": []}]


def test_resolve_path_helpers_cover_direct_nested_and_arrays() -> None:
    row = {
        "period": "2025-W14",
        "data": [{"snapshot": {"ts": "2026-01-01T00:00:00Z"}}],
    }
    assert _resolve_path_value(row, "period") == "2025-W14"
    assert _resolve_path_value(row, "data[].snapshot.ts") == "2026-01-01T00:00:00Z"
    assert _resolve_path_value(row, "missing.path") is None
    assert _resolve_path_value(row, ".") is None
    assert _resolve_path_value(["x"], "missing") is None
    assert _resolve_path_value(None, "x") is None
    assert _resolve_path_value(row, "") is None
    assert _resolve_path_collection({"data": [{"a": 1}]}, "data[]") == [{"a": 1}]
    assert _resolve_path_collection({"data": []}, "data[]") == []
    assert _resolve_path_collection({"data": []}, "") == []
    assert _resolve_path_value({"data": [{"nested": [{"v": "x"}]}]}, "data[].nested[].missing") is None


def test_as_datetime_and_basic_parsers_cover_success_and_failure() -> None:
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert _as_datetime(now) is not None
    assert _as_datetime(date(2026, 1, 2)) is not None
    assert _as_datetime(1_700_000_000) is not None
    assert _as_datetime(1_700_000_000_000) is not None
    assert _as_datetime("2026-01-02") is not None
    assert _as_datetime("2026/01/02") is not None
    assert _as_datetime("2026-01-02T01:02:03Z") is not None
    assert _as_datetime("   ") is None
    assert _as_datetime(10**100) is None
    assert _as_datetime("not-a-date") is None

    assert _parse_year("2026") is not None
    assert _parse_year("26") is None
    assert _parse_year_month("2026-02") is not None
    assert _parse_year_month("202613") is None
    assert _parse_year_week("2026-W05") is not None
    assert _parse_year_week("2026-W66") is None
    assert _parse_year_week("2021-W53") is None
    assert _parse_quarter("2026-Q2") is not None
    assert _parse_quarter("Q3-2026") is not None
    assert _parse_quarter("Q5-2026") is None


def test_parse_token_supports_period_tokens_and_week_period() -> None:
    fixed_now = datetime(2026, 3, 20, tzinfo=timezone.utc)
    start, end, bucket = _parse_token("YTD", fixed_now)
    assert start is not None and end is not None and bucket == "year"
    start, end, bucket = _parse_token("QTD", fixed_now)
    assert start is not None and end is not None and bucket == "quarter"
    start, end, bucket = _parse_token("MTD", fixed_now)
    assert start is not None and end is not None and bucket == "month"
    start, end, bucket = _parse_token("WTD", fixed_now)
    assert start is not None and end is not None and bucket == "week"
    start, end, bucket = _parse_token("2026P1W12", fixed_now)
    assert start is not None and end is not None and bucket == "week"
    start, end, bucket = _parse_token("2026P1W99", fixed_now)
    assert start is None and end is None and bucket is None
    start, end, bucket = _parse_token("BAD", fixed_now)
    assert start is None and end is None and bucket is None


def test_parse_profile_value_covers_named_profiles_and_errors() -> None:
    now = datetime(2026, 3, 20, tzinfo=timezone.utc)

    assert _parse_profile_value("2026-03-20", "iso_date", "single", now=now).ok is True
    assert _parse_profile_value("2026-03-20T10:00:00Z", "iso_datetime", "single", now=now).ok is True
    assert _parse_profile_value("bad", "iso_date", "single", now=now).ok is False

    assert _parse_profile_value(1_700_000_000, "unix_seconds", "single", now=now).ok is True
    assert _parse_profile_value(1_700_000_000_000, "unix_millis", "single", now=now).ok is True
    assert _parse_profile_value(None, "unix_seconds", "single", now=now).ok is False
    assert _parse_profile_value(None, "unix_millis", "single", now=now).ok is False
    assert _parse_profile_value("bad", "unix_millis", "single", now=now).ok is False

    assert _parse_profile_value("2026", "year", "single", now=now).ok is True
    assert _parse_profile_value("2026-03", "year_month", "single", now=now).ok is True
    assert _parse_profile_value("2026-W12", "year_week", "single", now=now).ok is True
    assert _parse_profile_value("2026-Q1", "quarter", "single", now=now).ok is True
    assert _parse_profile_value("YTD", "token", "single", now=now).ok is True

    assert _parse_profile_value("2026/03/20", "custom", "single", time_format="%Y/%m/%d", now=now).ok is True
    assert _parse_profile_value("2026-03-20", "custom", "single", time_format=None, now=now).ok is False
    assert _parse_profile_value("2026-03-20", "unknown_profile", "single", now=now).ok is False


def test_parse_profile_value_date_range_parses_list_dict_and_strings() -> None:
    now = datetime(2026, 3, 20, tzinfo=timezone.utc)
    assert _parse_profile_value(["2026-03-01", "2026-03-31"], "date_range", "single", now=now).ok is True
    assert _parse_profile_value({"start": "2026-03-01", "end": "2026-03-31"}, "date_range", "single", now=now).ok is True
    assert _parse_profile_value("2026-03-01..2026-03-31", "date_range", "single", now=now).ok is True
    assert _parse_profile_value("2026-03-01 to 2026-03-31", "date_range", "single", now=now).ok is True
    assert _parse_profile_value("bad range", "date_range", "single", now=now).ok is False


def test_parse_profile_value_date_list_and_list_rules() -> None:
    now = datetime(2026, 3, 20, tzinfo=timezone.utc)
    values = ["2026-03-01", "2026-03-08", "2026-03-15"]
    assert _parse_profile_value(values, "date_list", "first", now=now).ok is True
    assert _parse_profile_value(values, "date_list", "last", now=now).ok is True
    assert _parse_profile_value(values, "date_list", "single", now=now).ok is True
    range_result = _parse_profile_value(values, "date_list", "range", now=now)
    assert range_result.ok is True and range_result.time_end is not None
    assert _parse_profile_value(["bad"], "date_list", "single", now=now).ok is False

    # list input with extraction rule should route through list logic before profile auto/single parsing
    assert _parse_profile_value(values, "auto", "single", now=now).ok is True
    assert _parse_profile_value(values, "auto", "last", now=now).ok is True
    assert _parse_profile_value(values, "auto", "range", now=now).ok is True


def test_parse_profile_value_auto_infers_and_fails_cleanly() -> None:
    now = datetime(2026, 3, 20, tzinfo=timezone.utc)
    assert _parse_profile_value("2026-03-20", "auto", "single", now=now).ok is True
    assert _parse_profile_value("1700000000000", "auto", "single", now=now).ok is True
    assert _parse_profile_value("2026-W12", "auto", "single", now=now).ok is True
    assert _parse_profile_value("Q1-2026", "auto", "single", now=now).ok is True
    assert _parse_profile_value("YTD", "auto", "single", now=now).ok is True
    assert _parse_profile_value("not-a-time-token", "auto", "single", now=now).ok is False


def test_preview_time_mapping_handles_missing_time_field_and_limits() -> None:
    rows = [{"period": "2026-W10"} for _ in range(40)]
    preview = preview_time_mapping(
        rows=rows,
        time_field=None,
        time_profile="year_week",
        time_extraction_rule="single",
        sample_rows_limit=99,  # should clamp to 20
    )
    assert preview["sample_count"] == 20
    assert preview["summary"]["failure_count"] == 20
    assert preview["summary"]["success_count"] == 0
    assert preview["summary"]["confidence"] == 0
