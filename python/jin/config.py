from __future__ import annotations

import json
import re
import types
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Literal, Union, get_args, get_origin

from pydantic import BaseModel
from pydantic.fields import PydanticUndefined


@dataclass
class EndpointModelInfo:
    method: str
    path: str
    fields: list[dict[str, Any]]
    dimension_fields: list[str]
    kpi_fields: list[str]
    metrics: list[Any] = field(default_factory=list)
    array_field_path: str | None = None

    def schema_contract(self) -> dict[str, Any]:
        return build_schema_contract(self)


def _unwrap_annotation(annotation: Any) -> Any:
    origin = get_origin(annotation)
    if origin not in {Union, types.UnionType}:
        return annotation
    args = [arg for arg in get_args(annotation) if arg is not type(None)]
    return args[0] if len(args) == 1 else annotation


def _annotation_name(annotation: Any) -> str:
    if hasattr(annotation, "__name__"):
        return str(annotation.__name__)
    return str(annotation).replace("typing.", "")


def _nested_model_annotation(annotation: Any) -> tuple[Any, str] | None:
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return annotation, ""

    origin = get_origin(annotation)
    if origin not in {list, tuple, set, frozenset}:
        return None
    args = [arg for arg in get_args(annotation) if arg is not Ellipsis]
    if len(args) != 1:
        return None
    inner = _unwrap_annotation(args[0])
    if isinstance(inner, type) and issubclass(inner, BaseModel):
        return inner, "[]"
    return None


def _json_safe_example(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, BaseModel):
        return _json_safe_example(value.model_dump())
    if isinstance(value, Enum):
        return _json_safe_example(value.value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, tuple):
        return [_json_safe_example(item) for item in value]
    if isinstance(value, list):
        return [_json_safe_example(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _json_safe_example(item) for key, item in value.items()}
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _flatten_example_payload(value: Any, prefix: str = "") -> dict[str, Any]:
    mapping: dict[str, Any] = {}
    if isinstance(value, BaseModel):
        value = value.model_dump()

    if isinstance(value, dict):
        for raw_key, raw_val in value.items():
            key = f"{prefix}.{raw_key}" if prefix else str(raw_key)
            if isinstance(raw_val, dict):
                mapping.update(_flatten_example_payload(raw_val, key))
                continue
            if isinstance(raw_val, list):
                if not raw_val:
                    mapping[key] = []
                    continue
                first_non_null = next((item for item in raw_val if item is not None), raw_val[0])
                if isinstance(first_non_null, dict):
                    mapping.update(_flatten_example_payload(first_non_null, f"{key}[]"))
                else:
                    mapping[key] = _json_safe_example(first_non_null)
                continue
            mapping[key] = _json_safe_example(raw_val)
        return mapping

    if isinstance(value, list):
        if not value:
            return mapping
        first_non_null = next((item for item in value if item is not None), value[0])
        if isinstance(first_non_null, dict):
            return _flatten_example_payload(first_non_null, f"{prefix}[]" if prefix else "")
        if prefix:
            mapping[prefix] = _json_safe_example(first_non_null)
        return mapping

    if prefix:
        mapping[prefix] = _json_safe_example(value)
    return mapping


def _example_candidates(raw: Any) -> list[Any]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return list(raw)
    if isinstance(raw, dict):
        if "example" in raw:
            return [raw.get("example")]
        if "examples" in raw:
            examples = raw.get("examples")
            if isinstance(examples, list):
                return list(examples)
            if isinstance(examples, dict):
                values: list[Any] = []
                for item in examples.values():
                    if isinstance(item, dict) and "value" in item:
                        values.append(item.get("value"))
                    else:
                        values.append(item)
                return values
    return [raw]


def _model_example_map(model: type[BaseModel], prefix: str = "") -> dict[str, Any]:
    mapping: dict[str, Any] = {}
    candidates: list[Any] = []

    config_extra = getattr(model, "model_config", {}).get("json_schema_extra")
    candidates.extend(_example_candidates(config_extra))
    try:
        schema = model.model_json_schema()
    except Exception:
        schema = {}
    candidates.extend(_example_candidates(schema))

    for candidate in candidates:
        flattened = _flatten_example_payload(candidate, prefix=prefix)
        for key, value in flattened.items():
            if value is None:
                continue
            mapping.setdefault(key, value)
    return mapping


def _field_declared_example(field: Any) -> Any | None:
    examples = getattr(field, "examples", None)
    if isinstance(examples, list) and examples:
        for item in examples:
            if item is not None:
                return _json_safe_example(item)

    extra = getattr(field, "json_schema_extra", None)
    for candidate in _example_candidates(extra):
        if candidate is not None:
            return _json_safe_example(candidate)

    default = getattr(field, "default", PydanticUndefined)
    if default is not PydanticUndefined and default is not None:
        return _json_safe_example(default)
    return None


def _looks_like_time_example(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, (datetime, date)):
        return True
    if isinstance(value, (int, float)):
        number = float(value)
        return number >= 1000000000
    text = str(value).strip()
    if not text:
        return False
    lower = text.lower()
    if lower in {"ytd", "mtd", "qtd", "wtd"}:
        return True
    if len(text) >= 4 and text[:4].isdigit():
        if len(text) >= 10 and text[4] in {"-", "/"} and text[7] in {"-", "/"}:
            return True
        if len(text) == 7 and text[4] == "-" and text[5:7].isdigit():
            return True
    if len(text) in {10, 13} and text.isdigit():
        return True
    if "t" in lower and ":" in lower and "-" in lower:
        return True
    if "week" in lower or re.match(r"^\d{4}-w\d{1,2}$", lower):
        return True
    if re.match(r"^\d{4}(q[1-4]|-q[1-4])$", lower):
        return True
    return False


def _looks_like_time_name(name: str) -> bool:
    lower = name.lower()
    return any(
        token in lower
        for token in (
            "time",
            "date",
            "timestamp",
            "created_at",
            "updated_at",
            "snapshot",
            "period",
            "week",
            "month",
            "year",
            "day",
        )
    )


def classify_model(
    model: type[BaseModel] | None,
    prefix: str = "",
    inherited_example_map: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[str], list[str], str | None]:
    if model is None:
        return [], [], [], None

    example_map: dict[str, Any] = dict(inherited_example_map or {})
    for key, value in _model_example_map(model, prefix=prefix).items():
        example_map.setdefault(key, value)

    fields: list[dict[str, Any]] = []
    dimensions: list[str] = []
    kpis: list[str] = []
    array_path: str | None = None

    for name, field in model.model_fields.items():
        annotation = _unwrap_annotation(field.annotation)
        field_path: str = f"{prefix}.{name}" if prefix else str(name)
        nested_model = _nested_model_annotation(annotation)
        if nested_model is not None:
            nested_type, collection_suffix = nested_model
            if collection_suffix == "[]" and not array_path:
                array_path = field_path
            nested_path = f"{field_path}{collection_suffix}"
            sub_fields, sub_dims, sub_kpis, sub_array = classify_model(
                nested_type,
                nested_path,
                example_map,
            )
            fields.extend(sub_fields)
            dimensions.extend(sub_dims)
            kpis.extend(sub_kpis)
            if sub_array and not array_path:
                array_path = sub_array
            continue

        clean_name = str(name).lower()
        # Heuristics for "Child's Play" Discovery
        dim_keywords = {"id", "name", "type", "kind", "category", "code", "group", "retailer", "tenant", "region", "zip", "sku", "status", "period"}
        kpi_keywords = {"amount", "price", "revenue", "value", "total", "rate", "percentage", "score", "in_stock", "units", "count", "quantity", "cost"}

        kind = "ignore"
        time_candidate = False
        if annotation in (str,):
            kind = "dimension"
            # If name sounds like a KPI (e.g. amount_str), we still default to dimension but record why
            dimensions.append(field_path)
        elif isinstance(annotation, type) and issubclass(annotation, Enum):
            kind = "dimension"
            dimensions.append(field_path)
        elif get_origin(annotation) in {Literal} or "Literal" in str(get_origin(annotation)):
            kind = "dimension"
            dimensions.append(field_path)
        elif annotation in (int, float, Decimal):
            # If it's a number but named like an ID (e.g. store_id, zip_code), it's likely a dimension
            if any(k in clean_name for k in dim_keywords) and not any(k in clean_name for k in kpi_keywords):
                kind = "dimension"
                dimensions.append(field_path)
            else:
                kind = "kpi"
                kpis.append(field_path)
        elif annotation in (datetime, date):
            kind = "exclude"
            time_candidate = True
        elif annotation is bool:
            kind = "ignore"

        example_value = example_map.get(field_path)
        if example_value is None:
            example_value = _field_declared_example(field)
        if not time_candidate:
            time_candidate = annotation in (datetime, date) or _looks_like_time_example(example_value) or _looks_like_time_name(clean_name)

        field_payload: dict[str, Any] = {
            "name": field_path, 
            "kind": kind, 
            "annotation": _annotation_name(annotation),
            "suggested": kind != "ignore",
            "time_candidate": time_candidate,
        }
        if time_candidate:
            field_payload["suggested_role"] = "time"
        if example_value is not None:
            field_payload["example"] = example_value
        fields.append(field_payload)
    return fields, dimensions, kpis, array_path


def build_schema_contract(info: EndpointModelInfo) -> dict[str, Any]:
    payload = {
        "path": info.path,
        "method": info.method,
        "field_count": len(info.fields),
        "fields": info.fields,
        "dimension_fields": info.dimension_fields,
        "kpi_fields": info.kpi_fields,
        "array_field_path": info.array_field_path,
        "metrics": [{"name": m.name, "dimensions": [getattr(d, "name", "") for d in m.dimensions], "calculation": getattr(m.calculation, "field", "*")} for m in info.metrics],
    }
    example_row: dict[str, Any] = {}
    for field in info.fields:
        if not isinstance(field, dict):
            continue
        name = str(field.get("name") or "").strip()
        if not name:
            continue
        example = field.get("example")
        if example is None:
            continue
        example_row[name] = _json_safe_example(example)
    if example_row:
        payload["example_rows"] = [example_row]
    return payload


def build_config_json(info: EndpointModelInfo, overrides: dict[str, Any] | None = None) -> str:
    overrides = overrides or {}
    tolerance_normal = overrides.get("tolerance_normal", overrides.get("tolerance_pct", 10.0))
    active_tolerance = overrides.get("active_tolerance", "normal")
    tolerance_lookup = {
        "relaxed": overrides.get("tolerance_relaxed", 20.0),
        "normal": tolerance_normal,
        "strict": overrides.get("tolerance_strict", 5.0),
    }
    payload = {
        "dimension_fields": overrides.get("dimension_fields", info.dimension_fields),
        "kpi_fields": overrides.get("kpi_fields", info.kpi_fields),
        "tolerance_pct": tolerance_lookup.get(active_tolerance, tolerance_normal),
        "tolerance_relaxed": tolerance_lookup["relaxed"],
        "tolerance_normal": tolerance_lookup["normal"],
        "tolerance_strict": tolerance_lookup["strict"],
        "active_tolerance": active_tolerance,
        "confirmed": overrides.get("confirmed", False),
        "kpi_weights": overrides.get("kpi_weights", {}),
        "currency": overrides.get("currency", "$"),
        "time_field": overrides.get("time_field", info.path if not info.fields else None),
        "time_granularity": overrides.get("time_granularity", "minute"),
        "time_extraction_rule": overrides.get("time_extraction_rule", "single"),
        "excluded_fields": overrides.get("excluded_fields", []),
    }
    return json.dumps(payload)
