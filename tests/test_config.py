import json
from datetime import datetime
from enum import Enum
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

import jin.config as config_module
from jin.config import EndpointModelInfo, build_config_json, build_schema_contract, classify_model


class Metrics(BaseModel):
    RSV: float
    units: int


class SalesResponse(BaseModel):
    retailer: str
    period: str
    data: Metrics
    ratio: Decimal
    active: bool


class Channel(str, Enum):
    amazon = "amazon"


class AdvancedResponse(BaseModel):
    retailer: Channel
    period: Literal["YTD"]
    created_at: datetime
    active: bool


class MixedResponse(BaseModel):
    maybe: int | str
    metadata: dict[str, str]


class LineItem(BaseModel):
    sku: str
    quantity: int


class CollectionResponse(BaseModel):
    retailer: str
    items: list[LineItem]
    optional_items: list[LineItem] | None = None


class CollectionEdgeResponse(BaseModel):
    tags: list[str]
    pairs: tuple[str, int]


class ExampleTier(str, Enum):
    pro = "pro"


class ExampleNested(BaseModel):
    date: str
    value: int


class ExampleModel(BaseModel):
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "retailer": "amazon",
                    "items": [{"date": "2026-03-01", "value": 11}],
                    "tier": "pro",
                }
            ]
        }
    }
    retailer: str
    items: list[ExampleNested]
    tier: ExampleTier


class DeclaredExamplesModel(BaseModel):
    explicit_example: str = Field(examples=["abc", "def"])
    extra_example: str = Field(json_schema_extra={"example": "xyz"})
    from_default: int = 7


def test_classify_model_flattens_and_categorizes() -> None:
    fields, dims, kpis, array_path = classify_model(SalesResponse)
    assert "retailer" in dims
    assert "period" in dims
    assert "data.RSV" in kpis
    assert "data.units" in kpis
    assert "ratio" in kpis
    assert any(field["name"] == "data.RSV" for field in fields)


def test_build_config_json_prefers_overrides() -> None:
    info = EndpointModelInfo(
        method="GET",
        path="/api/sales",
        fields=[],
        dimension_fields=["retailer"],
        kpi_fields=["data.RSV"],
    )
    payload = build_config_json(
        info,
        overrides={
            "dimension_fields": ["period"],
            "kpi_fields": ["data.units"],
            "tolerance_pct": 15,
            "confirmed": True,
        },
    )
    assert '"dimension_fields": ["period"]' in payload
    assert '"kpi_fields": ["data.units"]' in payload
    assert '"tolerance_pct": 15' in payload
    assert '"confirmed": true' in payload.lower()


def test_schema_contract_contains_normalized_metadata() -> None:
    info = EndpointModelInfo(
        method="GET",
        path="/api/sales",
        fields=[{"name": "retailer", "kind": "dimension", "annotation": "str"}],
        dimension_fields=["retailer"],
        kpi_fields=["data.RSV"],
    )

    payload = build_schema_contract(info)

    assert payload["path"] == "/api/sales"
    assert payload["method"] == "GET"
    assert payload["field_count"] == 1
    assert payload["fields"][0]["name"] == "retailer"
    assert info.schema_contract()["kpi_fields"] == ["data.RSV"]


def test_classify_model_handles_enum_literal_and_datetime() -> None:
    fields, dims, kpis, array_path = classify_model(AdvancedResponse)
    assert dims == ["retailer", "period"]
    assert kpis == []
    assert any(field["name"] == "created_at" and field["kind"] == "exclude" for field in fields)
    assert any(field["name"] == "created_at" and field["time_candidate"] is True for field in fields)
    assert any(field["name"] == "created_at" and field["suggested_role"] == "time" for field in fields)
    assert any(field["name"] == "active" and field["kind"] == "ignore" for field in fields)
    assert classify_model(None) == ([], [], [], None)


def test_classify_model_marks_time_like_examples_as_time_candidates() -> None:
    class SnapshotResponse(BaseModel):
        snapshot_date: str = Field(examples=["2026-03-01"])
        total: int

    fields, dims, kpis, array_path = classify_model(SnapshotResponse)
    snapshot_field = next(item for item in fields if item["name"] == "snapshot_date")

    assert "snapshot_date" in dims
    assert kpis == ["total"]
    assert snapshot_field["time_candidate"] is True
    assert snapshot_field["suggested_role"] == "time"
    assert snapshot_field["example"] == "2026-03-01"


def test_classify_model_keeps_non_optional_unions_ignored() -> None:
    fields, dims, kpis, array_path = classify_model(MixedResponse)
    assert dims == []
    assert kpis == []
    assert any(field["name"] == "maybe" and field["kind"] == "ignore" for field in fields)
    assert any(field["name"] == "metadata" and field["kind"] == "ignore" for field in fields)


def test_classify_model_handles_collection_wrapped_nested_models() -> None:
    fields, dims, kpis, array_path = classify_model(CollectionResponse)
    assert "retailer" in dims
    assert "items[].sku" in dims
    assert "items[].quantity" in kpis
    assert "optional_items[].sku" in dims
    assert "optional_items[].quantity" in kpis
    assert any(field["name"] == "items[].quantity" and field["annotation"] == "int" for field in fields)


def test_classify_model_ignores_non_model_collections() -> None:
    fields, dims, kpis, array_path = classify_model(CollectionEdgeResponse)
    assert dims == []
    assert kpis == []
    assert any(field["name"] == "tags" and field["kind"] == "ignore" for field in fields)
    assert any(field["name"] == "pairs" and field["kind"] == "ignore" for field in fields)


def test_json_safe_example_and_flatten_payload_cover_edge_types() -> None:
    class Obj:
        def __str__(self) -> str:
            return "obj-string"

    payload = {
        "model": ExampleNested(date="2026-03-01", value=5),
        "enum": ExampleTier.pro,
        "dt": datetime(2026, 3, 1, 10, 15, 0),
        "decimal": Decimal("12.5"),
        "tuple_values": (1, Decimal("2.2")),
        "list_values": [True, ExampleTier.pro],
        "dict_values": {"a": Decimal("3.1")},
        "obj": Obj(),
    }

    safe = config_module._json_safe_example(payload)
    assert safe["model"]["value"] == 5
    assert safe["enum"] == "pro"
    assert safe["dt"].startswith("2026-03-01T10:15:00")
    assert safe["decimal"] == 12.5
    assert safe["tuple_values"] == [1, 2.2]
    assert safe["list_values"] == [True, "pro"]
    assert safe["dict_values"]["a"] == 3.1
    assert safe["obj"] == "obj-string"

    flattened = config_module._flatten_example_payload(
        {
            "root": {"nested": 1},
            "arr_dict": [{"x": 9}],
            "arr_scalar": [None, "first"],
            "arr_empty": [],
        }
    )
    assert flattened["root.nested"] == 1
    assert flattened["arr_dict[].x"] == 9
    assert flattened["arr_scalar"] == "first"
    assert flattened["arr_empty"] == []
    assert config_module._flatten_example_payload([{"x": 1}], prefix="p") == {"p[].x": 1}
    assert config_module._flatten_example_payload([], prefix="p") == {}
    assert config_module._flatten_example_payload(["v"], prefix="p") == {"p": "v"}
    assert config_module._flatten_example_payload("s", prefix="p") == {"p": "s"}


def test_example_candidates_and_example_map_extract_examples() -> None:
    assert config_module._example_candidates(None) == []
    assert config_module._example_candidates([1, 2]) == [1, 2]
    assert config_module._example_candidates({"example": 5}) == [5]
    assert config_module._example_candidates({"examples": [7, 8]}) == [7, 8]
    assert config_module._example_candidates({"examples": {"a": {"value": 9}, "b": 10}}) == [9, 10]
    assert config_module._example_candidates("x") == ["x"]

    mapped = config_module._model_example_map(ExampleModel)
    assert mapped["retailer"] == "amazon"
    assert mapped["items[].date"] == "2026-03-01"
    assert mapped["items[].value"] == 11
    assert mapped["tier"] == "pro"


def test_field_declared_example_prefers_examples_then_extra_then_default() -> None:
    fields = DeclaredExamplesModel.model_fields
    assert config_module._field_declared_example(fields["explicit_example"]) == "abc"
    assert config_module._field_declared_example(fields["extra_example"]) == "xyz"
    assert config_module._field_declared_example(fields["from_default"]) == 7


def test_classify_model_numeric_id_is_dimension_and_schema_contract_examples() -> None:
    class NumericIdModel(BaseModel):
        store_id: int = Field(examples=[1001])
        revenue: float = Field(examples=[1500.5])

    fields, dims, kpis, _ = classify_model(NumericIdModel)
    assert "store_id" in dims
    assert "revenue" in kpis
    store_field = next(item for item in fields if item["name"] == "store_id")
    revenue_field = next(item for item in fields if item["name"] == "revenue")
    assert store_field["example"] == 1001
    assert revenue_field["example"] == 1500.5

    info = EndpointModelInfo(
        method="GET",
        path="/api/numeric",
        fields=[None, {"name": "", "kind": "ignore"}, store_field, revenue_field],  # type: ignore[list-item]
        dimension_fields=dims,
        kpi_fields=kpis,
    )
    contract = build_schema_contract(info)
    assert contract["example_rows"][0]["store_id"] == 1001
    assert contract["example_rows"][0]["revenue"] == 1500.5


def test_build_config_json_uses_time_field_fallback_and_tolerance_fallback() -> None:
    info = EndpointModelInfo(
        method="GET",
        path="/api/raw",
        fields=[],
        dimension_fields=["retailer"],
        kpi_fields=["value"],
    )
    payload = build_config_json(
        info,
        overrides={
            "active_tolerance": "unknown-tier",
            "tolerance_normal": 12.0,
        },
    )
    parsed = json.loads(payload)
    assert parsed["time_field"] == "/api/raw"
    assert parsed["tolerance_pct"] == 12.0
