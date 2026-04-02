from __future__ import annotations

import csv
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

try:
    from openpyxl import load_workbook
except ImportError:  # pragma: no cover
    load_workbook = None
 
from jin.technical_metadata import TECHNICAL_METADATA_FIELDS, default_technical_metadata_value


# ──────────────────────────────────────────────────────────────────────────────
# Column detection helpers
# ──────────────────────────────────────────────────────────────────────────────

def _is_internal_format(row: dict[str, Any]) -> bool:
    """Return True when the upload uses the legacy internal column layout.

    The legacy format has ``endpoint``, ``dimension_fields``, and ``kpi_fields``
    columns embedded in the sheet.  The new PO-friendly format omits them.
    """
    return "endpoint" in row and "dimension_fields" in row and "kpi_fields" in row


def _validate_rows_internal(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate and return rows that use the old internal column format."""
    if not rows:  # pragma: no cover
        raise ValueError("Empty file")
    required = {"endpoint", "dimension_fields", "kpi_fields", "tolerance_pct"}
    missing = required - set(rows[0].keys())
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")
    return rows


import re

def _normalize_header(s: str) -> str:
    """Lowercase and strip non-alphanumeric characters for fuzzy matching."""
    return re.sub(r'[^a-z0-9]', '', s.lower())


def _field_leaf(field: str) -> str:
    return field.replace("[]", "").split(".")[-1]


def _is_technical_metadata_field(field: str) -> bool:
    return field in TECHNICAL_METADATA_FIELDS or _field_leaf(field) in TECHNICAL_METADATA_FIELDS


def _technical_default_for_field(field: str, defaults: dict[str, str]) -> str:
    if field in defaults:
        return defaults[field]
    leaf = _field_leaf(field)
    if leaf in defaults:
        return defaults[leaf]
    return default_technical_metadata_value(leaf)


def _validate_rows_po(
    rows: list[dict[str, Any]],
    dimension_fields: list[str],
    kpi_fields: list[str],
    endpoint: str,
) -> list[dict[str, Any]]:
    """Validate rows from the PO-friendly template format with fuzzy matching.

    The PO template has plain field names (e.g. ``Retailer``) that are matched
    fuzzily against the registry (e.g. ``retailer`` or ``data[].retailer``).
    """
    if not rows:  # pragma: no cover
        raise ValueError("Empty file")
    
    headers = list(rows[0].keys())
    # Create a mapping from normalized header to original header in the file
    header_map = {_normalize_header(h): h for h in headers if h}
    
    # Map required fields to actual headers in the file
    field_to_header: dict[str, str] = {}
    missing = []
    
    all_needed = dimension_fields + kpi_fields
    for field in all_needed:
        norm_field = _normalize_header(field)
        if norm_field in header_map:
            field_to_header[field] = header_map[norm_field]
        else:
            # Try a "contains" match for nested fields (e.g. "revenue" matches "data[].revenue")
            # We look for a header that, when normalized, is contained in the normalized field name
            # or vice versa.
            found = False
            
            # Semantic aliases map: normalized PO term -> list of substrings to match in internal field
            aliases = {
                "product": ["sku", "item", "grain"],
                "name": ["sku", "item", "grain"],
                "target": ["expected", "baseline", "ref"],
                "goal": ["expected", "baseline", "ref"],
                "actual": ["value", "reality"],
                "revenue": ["amount", "price", "sales"],
                "sales": ["revenue", "amount", "orders"],
                "stock": ["inventory", "instock", "count"],
            }

            for norm_h, original_h in header_map.items():
                if not norm_h: continue
                
                # 1. Direct or substring match
                if norm_h in norm_field or norm_field in norm_h:
                    field_to_header[field] = original_h
                    found = True
                    break
                
                # 2. Alias match
                for alias_key, targets in aliases.items():
                    if alias_key in norm_h:
                        if any(t in norm_field for t in targets):
                            field_to_header[field] = original_h
                            found = True
                            break
                if found: break
                
            if not found and not _is_technical_metadata_field(field):
                missing.append(field)

    if missing:
        raise ValueError(
            f"Missing required columns in upload: {', '.join(sorted(missing))}. "
            f"Expected columns: {', '.join(sorted(all_needed))}."
        )

    # Inject the internal fields so the rest of the pipeline understands the rows
    out: list[dict[str, Any]] = []
    for row in rows:
        # Order must match expected_upload_columns: 
        # [endpoint, dimension_fields, kpi_fields, *grains, *kpis, tolerance_pct]
        enriched: dict[str, Any] = {
            "endpoint": endpoint,
            "dimension_fields": ",".join(dimension_fields),
            "kpi_fields": ",".join(kpi_fields),
        }
        for field in dimension_fields:
            actual_header = field_to_header.get(field)
            enriched[f"grain_{field}"] = row.get(actual_header, "") if actual_header else ""
        for field in kpi_fields:
            actual_header = field_to_header.get(field)
            enriched[f"expected_{field}"] = row.get(actual_header, "") if actual_header else ""
        
        enriched["tolerance_pct"] = str(row.get("tolerance_pct") or row.get("Tolerance %") or "10")
        out.append(enriched)
    return out


# ──────────────────────────────────────────────────────────────────────────────
# Public helpers (used by the router)
# ──────────────────────────────────────────────────────────────────────────────

def expected_upload_columns(dimension_fields: list[str], kpi_fields: list[str]) -> list[str]:
    return [
        "endpoint",
        "dimension_fields",
        "kpi_fields",
        *[f"grain_{field}" for field in dimension_fields],
        *[f"expected_{field}" for field in kpi_fields],
        "tolerance_pct",
    ]


def parse_csv_upload(content: bytes) -> list[dict[str, Any]]:
    rows = list(csv.DictReader(StringIO(content.decode())))
    return rows  # raw; let validate_upload_rows normalise


def parse_csv_upload_path(path: str) -> list[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def parse_xlsx_upload(content: bytes) -> list[dict[str, Any]]:
    if load_workbook is None:  # pragma: no cover
        raise RuntimeError("openpyxl is required for XLSX uploads")
    workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
    # Always use first sheet named "Data" if present, otherwise fall back to active
    sheet = workbook["Data"] if "Data" in workbook.sheetnames else workbook.active
    iterator = sheet.iter_rows(values_only=True)
    try:
        header_row = next(iterator)
    except StopIteration as exc:
        raise ValueError("Empty file") from exc
    headers = [str(value) for value in header_row]
    data = [dict(zip(headers, row)) for row in iterator if any(value is not None for value in row)]
    return data  # raw; let validate_upload_rows normalise


def parse_xlsx_upload_path(path: str) -> list[dict[str, Any]]:
    if load_workbook is None:  # pragma: no cover
        raise RuntimeError("openpyxl is required for XLSX uploads")
    workbook = load_workbook(path, read_only=True, data_only=True)
    sheet = workbook["Data"] if "Data" in workbook.sheetnames else workbook.active
    iterator = sheet.iter_rows(values_only=True)
    try:
        header_row = next(iterator)
    except StopIteration as exc:
        raise ValueError("Empty file") from exc
    headers = [str(value) for value in header_row]
    return [dict(zip(headers, row)) for row in iterator if any(value is not None for value in row)]


# ──────────────────────────────────────────────────────────────────────────────
# Core validation + normalisation
# ──────────────────────────────────────────────────────────────────────────────

def validate_upload_rows(
    rows: list[dict[str, Any]],
    field_names: set[str],
    expected_fields: list[str] | None = None,
    *,
    endpoint: str = "",
    dimension_fields: list[str] | None = None,
    kpi_fields: list[str] | None = None,
    technical_defaults: dict[str, str] | None = None,
) -> tuple[list[str], list[str], list[dict[str, Any]], list[str]]:
    """Validate and normalise upload rows.

    Accepts both the new PO-friendly format (plain column names) and the
    legacy internal format (``endpoint``/``dimension_fields``/``kpi_fields``
    meta-columns).

    Returns ``(dimension_fields, kpi_fields, normalised_rows, warnings)``.
    """
    if not rows:
        raise ValueError("Empty file")

    if _is_internal_format(rows[0]):
        rows = _validate_rows_internal(rows)
    else:
        if not dimension_fields or not kpi_fields:
            raise ValueError(
                "The upload file uses the simple template format but "
                "the server did not receive the expected field configuration. "
                "Please download a fresh template and try again."
            )
        rows = _validate_rows_po(rows, dimension_fields, kpi_fields, endpoint or "unknown")

    # Now rows are guaranteed to be in internal format
    raw_dimensions = [item.strip() for item in str(rows[0]["dimension_fields"]).split(",") if item.strip()]
    raw_kpis = [item.strip() for item in str(rows[0]["kpi_fields"]).split(",") if item.strip()]

    for field in [*raw_dimensions, *raw_kpis]:
        if field not in field_names:
            raise ValueError(f"Unknown field in upload: {field!r}")

    expected_columns = expected_upload_columns(raw_dimensions, raw_kpis)
    if expected_fields is not None:
        row_columns = list(rows[0].keys())
        if set(row_columns) != set(expected_fields):
            missing = [column for column in expected_fields if column not in rows[0]]
            extra = [column for column in rows[0].keys() if column not in expected_fields]
            parts: list[str] = []
            if missing:
                parts.append(f"missing {', '.join(missing)}")
            if extra:
                parts.append(f"unexpected {', '.join(extra)}")
            detail = "; ".join(parts) if parts else "column order mismatch"
            raise ValueError(f"Upload columns do not match template: {detail}")

    defaults = technical_defaults or {}
    warnings: list[str] = []
    promoted_dimensions: list[str] = []
    promoted_dimension_set: set[str] = set()

    normalized = []
    for index, row in enumerate(rows, start=2):
        tolerance = row.get("tolerance_pct", 10)
        try:
            tolerance_value = float(tolerance)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid tolerance at row {index}") from exc
        if not 1 <= tolerance_value <= 100:
            warnings.append(f"Row {index}: tolerance_pct {tolerance_value} out of range, defaulted to 10")
            tolerance_value = 10.0

        entry: dict[str, Any] = {
            "endpoint": row["endpoint"],
            "dimension_fields": raw_dimensions,
            "kpi_fields": raw_kpis,
            "tolerance_pct": tolerance_value,
            "dimensions": {},
            "expected": {},
        }
        for key, value in row.items():
            if key.startswith("grain_"):
                entry["dimensions"][key.removeprefix("grain_")] = "" if value is None else str(value)
            if key.startswith("expected_"):
                expected_field = key.removeprefix("expected_")
                if value in (None, ""):
                    continue
                try:
                    entry["expected"][expected_field] = float(value)
                except (TypeError, ValueError) as exc:
                    if expected_field in raw_dimensions or _is_technical_metadata_field(expected_field):
                        if expected_field not in promoted_dimension_set and expected_field not in raw_dimensions:
                            promoted_dimensions.append(expected_field)
                            promoted_dimension_set.add(expected_field)
                        entry["dimensions"][expected_field] = str(value)
                        warnings.append(
                            f"Row {index}: {key} is text; treated as contextual field and excluded from numeric KPI checks"
                        )
                        continue
                    raise ValueError(f"Expected value must be numeric at row {index} column {key}") from exc
        for field in raw_dimensions:
            column = f"grain_{field}"
            if column in row and entry["dimensions"].get(field):
                continue
            if _is_technical_metadata_field(field):
                entry["dimensions"][field] = _technical_default_for_field(field, defaults)
                continue
            if column not in row:
                raise ValueError(f"Missing required columns: {column}")
        for field in raw_kpis:
            column = f"expected_{field}"
            if column not in row:
                raise ValueError(f"Missing required columns: {column}")
        entry["_row_index"] = index
        normalized.append(entry)

    final_dimensions = [*raw_dimensions, *promoted_dimensions]
    final_kpis = [field for field in raw_kpis if field not in promoted_dimension_set]

    seen_combinations: dict[tuple[str, tuple[tuple[str, str], ...]], int] = {}
    for position, entry in enumerate(normalized):
        for field in final_dimensions:
            if entry["dimensions"].get(field):
                continue
            if _is_technical_metadata_field(field):
                entry["dimensions"][field] = _technical_default_for_field(field, defaults)
                continue
            entry["dimensions"].setdefault(field, "")
        combination_key = (
            str(entry["endpoint"]),
            tuple((field, entry["dimensions"].get(field, "")) for field in final_dimensions),
        )
        row_index = int(entry.get("_row_index", position + 2))
        if combination_key in seen_combinations:
            warnings.append(
                f"Row {row_index}: duplicate grain combination for endpoint {entry['endpoint']}; last row wins"
            )
        seen_combinations[combination_key] = position

    deduped: list[dict[str, Any]] = []
    for index in sorted(seen_combinations.values()):
        item = dict(normalized[index])
        item.pop("_row_index", None)
        deduped.append(item)
    return final_dimensions, final_kpis, deduped, warnings
