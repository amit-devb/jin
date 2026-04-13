from jin.templates import (
    _business_columns,
    _col_letter,
    _example_dimension_value,
    _example_kpi_value,
    _example_row,
    _example_rows,
    _example_text,
    _field_annotations,
    _field_examples,
    _internal_from_row,
    _type_label,
    _vary_dimension_example,
    _vary_metric_example,
    convert_po_rows_to_internal,
    generate_csv_template,
    generate_xlsx_template,
    template_columns,
)
from jin.uploader import parse_xlsx_upload


def test_template_columns_match_spec() -> None:
    assert template_columns(["retailer", "period"], ["RSV", "data.units"]) == [
        "endpoint",
        "dimension_fields",
        "kpi_fields",
        "grain_retailer",
        "grain_period",
        "expected_RSV",
        "expected_data.units",
        "tolerance_pct",
    ]


def test_generate_templates_round_trip() -> None:
    csv_bytes = generate_csv_template("/api/sales", ["retailer"], ["RSV"])
    assert b"retailer,RSV,tolerance_pct" in csv_bytes
    csv_lines = csv_bytes.decode("utf-8").splitlines()
    assert len(csv_lines) >= 4

    xlsx_bytes = generate_xlsx_template("/api/sales", ["retailer"], ["RSV"])
    rows = parse_xlsx_upload(xlsx_bytes)
    assert rows[0]["retailer"] == "amazon"
    assert rows[1]["retailer"] == "shopify"
    assert rows[2]["retailer"] == "walmart"
    assert rows[0]["RSV"] == "1500.50"
    assert rows[0]["tolerance_pct"] == "10"


def test_templates_use_field_type_aware_examples() -> None:
    fields = [
        {"name": "data[].snapshot_date", "annotation": "date"},
        {"name": "data[].in_stock", "annotation": "int"},
        {"name": "data[].sell_through", "annotation": "float"},
    ]
    csv_bytes = generate_csv_template(
        "/api/inventory",
        ["data[].snapshot_date"],
        ["data[].in_stock", "data[].sell_through"],
        fields=fields,
    )
    text = csv_bytes.decode("utf-8")
    assert "2026-01-31" in text
    assert "120" in text
    assert "0.92" in text


def test_templates_prefer_declared_field_examples() -> None:
    fields = [
        {"name": "retailer", "annotation": "str", "example": "walmart"},
        {"name": "RSV", "annotation": "float", "example": 9876.54},
    ]

    csv_bytes = generate_csv_template(
        "/api/sales",
        ["retailer"],
        ["RSV"],
        fields=fields,
    )
    text = csv_bytes.decode("utf-8")
    assert "walmart" in text
    assert "9876.54" in text

    xlsx_bytes = generate_xlsx_template(
        "/api/sales",
        ["retailer"],
        ["RSV"],
        fields=fields,
    )
    rows = parse_xlsx_upload(xlsx_bytes)
    assert rows[0]["retailer"] == "walmart"
    assert str(rows[0]["RSV"]) == "9876.54"


def test_csv_template_example_row_keeps_header_alignment_with_technical_dimensions() -> None:
    csv_bytes = generate_csv_template("/api/sales", ["retailer", "api_version"], ["RSV"])
    lines = csv_bytes.decode("utf-8").splitlines()
    assert len(lines) >= 4
    header = lines[0].split(",")
    first_sample = lines[1].split(",")
    second_sample = lines[2].split(",")
    third_sample = lines[3].split(",")
    assert header == ["retailer", "RSV", "tolerance_pct"]
    assert len(first_sample) == len(header)
    assert len(second_sample) == len(header)
    assert len(third_sample) == len(header)


def test_template_helper_functions_cover_branch_cases() -> None:
    fields = [
        None,
        {},
        {"name": " ", "annotation": "str"},
        {"name": "data[].snapshot_date", "annotation": "date", "example": "2026-01-01"},
        {"name": "data[].orders", "type": "int", "example": 12},
    ]
    annotations = _field_annotations(fields)  # type: ignore[arg-type]
    examples = _field_examples(fields)  # type: ignore[arg-type]
    assert annotations["data[].snapshot_date"] == "date"
    assert annotations["snapshot_date"] == "date"
    assert examples["data[].orders"] == 12
    assert examples["orders"] == 12

    assert _example_text(True) == "true"
    assert _example_text(False) == "false"
    assert _example_text({"a": 1}) == '{"a":1}'
    assert _type_label("int", "x") == "whole number"
    assert _type_label("float", "x") == "decimal number"
    assert _type_label("bool", "x") == "true/false"
    assert _type_label("date", "x") == "date (YYYY-MM-DD)"
    assert _type_label("unknown", "revenue", metric=True) == "number"
    assert _type_label("unknown", "snapshot_time", metric=False) == "date (YYYY-MM-DD)"
    assert _type_label("unknown", "name", metric=False) == "text"

    assert _example_dimension_value("snapshot_date", "date") == "2026-01-31"
    assert _example_dimension_value("retailer", "") == "amazon"
    assert _example_dimension_value("region", "") == "north"
    assert _example_dimension_value("country", "") == "US"
    assert _example_dimension_value("product_sku", "") == "SKU-1001"
    assert _example_dimension_value("label", "") == "current"
    assert _example_dimension_value("api_version", "") == "v1"
    assert _example_dimension_value("store_id", "") == "id-001"
    assert _example_dimension_value("flag", "bool") == "true"
    assert _example_dimension_value("custom_name", "", example="chosen") == "chosen"
    assert _example_dimension_value("fallback_field", "") == "fallback_field_a"

    assert _example_kpi_value("orders", "") == "120"
    assert _example_kpi_value("sell_through_rate", "") == "0.92"
    assert _example_kpi_value("revenue", "") == "1500.50"
    assert _example_kpi_value("score", "int") == "120"
    assert _example_kpi_value("score", "float") == "0.92"
    assert _example_kpi_value("custom_metric", "", example=99.1) == "99.1"
    assert _example_kpi_value("other_metric", "") == "100"

    assert _business_columns(["retailer", "api_version"], ["RSV"]) == ["retailer", "RSV", "tolerance_pct"]
    assert _col_letter(1) == "A"
    assert _col_letter(26) == "Z"
    assert _col_letter(27) == "AA"


def test_convert_po_rows_to_internal_and_default_values() -> None:
    row = {"retailer": "amazon", "RSV": "1200"}
    converted = _internal_from_row(row, "/api/sales", ["retailer"], ["RSV"])
    assert converted["endpoint"] == "/api/sales"
    assert converted["dimension_fields"] == "retailer"
    assert converted["kpi_fields"] == "RSV"
    assert converted["grain_retailer"] == "amazon"
    assert converted["expected_RSV"] == "1200"
    assert converted["tolerance_pct"] == "10"

    batch = convert_po_rows_to_internal([row], "/api/sales", ["retailer"], ["RSV"])
    assert batch[0] == converted


def test_generate_xlsx_template_handles_empty_dimension_and_kpi_lists() -> None:
    xlsx_bytes = generate_xlsx_template("/api/empty", [], [])
    rows = parse_xlsx_upload(xlsx_bytes)
    assert len(rows) == 3
    assert rows[0]["tolerance_pct"] == "10"
    assert rows[1]["tolerance_pct"] == "10"
    assert rows[2]["tolerance_pct"] == "10"


def test_template_variation_helpers_cover_fallback_paths() -> None:
    assert _vary_dimension_example("snapshot_date", "not-a-date", 1) == "not-a-date_b"
    assert _vary_dimension_example("country", "US", 2) == "UK"
    assert _vary_dimension_example("period", "YTD", 2) == "QTD"
    assert _vary_dimension_example("label", "current", 2) == "target"
    assert _vary_dimension_example("api_version", "v1", 2) == "v3"
    assert _vary_dimension_example("store_id", "id-not-numeric", 2) == "id-not-numeric_c"

    assert _vary_metric_example("not-a-number", 1) == "not-a-number_b"
    assert _vary_metric_example("100", 2) == "94"

    row = _example_row(
        ["retailer"],
        ["amount"],
        fields=[],
        columns=["retailer", "amount", "tolerance_pct", "extra"],
    )
    assert row == ["amazon", "1500.50", "10", ""]

    rows = _example_rows(
        ["retailer"],
        ["amount"],
        fields=[],
        columns=["retailer", "amount", "tolerance_pct", "extra"],
        count=0,
    )
    assert len(rows) == 1
    assert rows[0][-1] == ""
