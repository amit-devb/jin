from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any


@dataclass
class TimeParseResult:
    ok: bool
    profile_used: str
    time_start: str | None = None
    time_end: str | None = None
    bucket_hint: str | None = None
    warning: str | None = None
    error: str | None = None


def _iso(dt: datetime) -> str:
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.replace(microsecond=0).isoformat(sep=" ")


def _as_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, (int, float)):
        # Heuristic: >= 10^11 is millis, otherwise seconds.
        raw = float(value)
        ts = raw / 1000.0 if abs(raw) >= 1e11 else raw
        try:
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        except Exception:
            return None
    text = str(value).strip()
    if not text:
        return None
    if re.match(r"^\d{10,13}$", text):
        return _as_datetime(float(text))
    normalized = text.replace("Z", "+00:00") if text.endswith("Z") else text
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _parse_year(text: str) -> datetime | None:
    match = re.match(r"^(\d{4})$", text)
    if not match:
        return None
    return datetime(int(match.group(1)), 1, 1)


def _parse_year_month(text: str) -> datetime | None:
    match = re.match(r"^(\d{4})[-_/]?(\d{2})$", text)
    if not match:
        return None
    year = int(match.group(1))
    month = int(match.group(2))
    if month < 1 or month > 12:
        return None
    return datetime(year, month, 1)


def _parse_year_week(text: str) -> datetime | None:
    match = re.match(r"^(\d{4})[-_/]?(?:W)?(\d{1,2})$", text, re.IGNORECASE)
    if not match:
        return None
    year = int(match.group(1))
    week = int(match.group(2))
    if week < 1 or week > 53:
        return None
    try:
        week_start = date.fromisocalendar(year, week, 1)
    except ValueError:
        return None
    return datetime.combine(week_start, datetime.min.time())


def _parse_quarter(text: str) -> datetime | None:
    match = re.match(r"^(\d{4})[-_/ ]?Q([1-4])$", text, re.IGNORECASE)
    if not match:
        match = re.match(r"^Q([1-4])[-_/ ]?(\d{4})$", text, re.IGNORECASE)
        if not match:
            return None
        quarter = int(match.group(1))
        year = int(match.group(2))
    else:
        year = int(match.group(1))
        quarter = int(match.group(2))
    month = (quarter - 1) * 3 + 1
    return datetime(year, month, 1)


def _parse_token(text: str, now: datetime) -> tuple[datetime | None, datetime | None, str | None]:
    token = text.strip().upper()
    today = now.date()
    if token == "YTD":
        return datetime(today.year, 1, 1), datetime.combine(today, datetime.max.time()), "year"
    if token == "QTD":
        quarter = ((today.month - 1) // 3) + 1
        start_month = (quarter - 1) * 3 + 1
        return datetime(today.year, start_month, 1), datetime.combine(today, datetime.max.time()), "quarter"
    if token == "MTD":
        return datetime(today.year, today.month, 1), datetime.combine(today, datetime.max.time()), "month"
    if token == "WTD":
        start = today - timedelta(days=today.weekday())
        return datetime.combine(start, datetime.min.time()), datetime.combine(today, datetime.max.time()), "week"

    period_week = re.match(r"^(?:(\d{4})[-_/]?)?P(\d+)W(\d+)$", token)
    if period_week:
        year = int(period_week.group(1) or today.year)
        week = int(period_week.group(3))
        try:
            start = date.fromisocalendar(year, week, 1)
        except ValueError:
            return None, None, None
        end = start + timedelta(days=6)
        return datetime.combine(start, datetime.min.time()), datetime.combine(end, datetime.max.time()), "week"

    return None, None, None


def _resolve_path_value(row: Any, field_path: str) -> Any:
    if row is None or not field_path:
        return None
    if isinstance(row, dict) and field_path in row:
        return row[field_path]
    parts = [part for part in str(field_path).split(".") if part]
    if not parts:
        return None

    def _walk(node: Any, index: int) -> Any:
        if node is None:
            return None
        if index >= len(parts):
            return node
        part = parts[index]
        is_array = part.endswith("[]")
        key = part[:-2] if is_array else part
        if not is_array:
            if isinstance(node, dict):
                return _walk(node.get(key), index + 1)
            return None

        candidate = node.get(key) if key and isinstance(node, dict) else node
        if not isinstance(candidate, list) or not candidate:
            return None
        if index == len(parts) - 1:
            return candidate
        for item in candidate:
            resolved = _walk(item, index + 1)
            if resolved is not None:
                return resolved
        return _walk(candidate[0], index + 1)

    return _walk(row, 0)


def _resolve_path_collection(payload: Any, path: str) -> list[dict[str, Any]]:
    if not path:
        return []
    value = _resolve_path_value(payload, path)
    return normalize_rows(value)


def normalize_rows(payload: Any) -> list[dict[str, Any]]:
    if payload is None:
        return []
    if isinstance(payload, dict):
        return [payload]
    if isinstance(payload, list):
        rows: list[dict[str, Any]] = []
        for item in payload:
            if isinstance(item, dict):
                rows.append(item)
            else:
                rows.append({"value": item})
        return rows
    return [{"value": payload}]


def extract_rows(
    sample_payload: Any,
    *,
    rows_path: str | None = None,
    default_array_path: str | None = None,
) -> tuple[list[dict[str, Any]], str]:
    if rows_path:
        rows = _resolve_path_collection(sample_payload, rows_path)
        return rows, "rows_path"

    if isinstance(sample_payload, list):
        return normalize_rows(sample_payload), "payload_list"

    if isinstance(sample_payload, dict) and default_array_path:
        rows = _resolve_path_collection(sample_payload, default_array_path)
        if rows:
            return rows, "default_array_path"

    if isinstance(sample_payload, dict):
        list_candidates = [v for v in sample_payload.values() if isinstance(v, list) and v and isinstance(v[0], dict)]
        if list_candidates:
            best = max(list_candidates, key=len)
            return normalize_rows(best), "first_object_list"
        return [sample_payload], "payload_object"

    return normalize_rows(sample_payload), "scalar_payload"


def _parse_profile_value(
    raw_value: Any,
    profile: str,
    extraction_rule: str,
    *,
    time_end_value: Any = None,
    time_format: str | None = None,
    now: datetime,
) -> TimeParseResult:
    profile = (profile or "auto").strip().lower()
    extraction_rule = (extraction_rule or "single").strip().lower()

    def _parse_single(value: Any, single_profile: str) -> TimeParseResult:
        text = str(value).strip() if value is not None else ""
        if single_profile in {"iso", "iso_date", "iso_datetime"}:
            parsed = _as_datetime(value)
            if parsed is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Could not parse ISO date/time value.")
            bucket = "day" if "T" not in text and ":" not in text else "minute"
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint=bucket)
        if single_profile == "unix_seconds":
            if value is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Unix seconds value is missing.")
            try:
                parsed = datetime.fromtimestamp(float(value), tz=timezone.utc)
            except Exception:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Could not parse unix_seconds value.")
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint="minute")
        if single_profile == "unix_millis":
            if value is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Unix millis value is missing.")
            try:
                parsed = datetime.fromtimestamp(float(value) / 1000.0, tz=timezone.utc)
            except Exception:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Could not parse unix_millis value.")
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint="minute")
        if single_profile == "year":
            parsed = _parse_year(text)
            if parsed is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Expected year format (YYYY).")
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint="year")
        if single_profile == "year_month":
            parsed = _parse_year_month(text)
            if parsed is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Expected year-month format (YYYY-MM or YYYYMM).")
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint="month")
        if single_profile == "year_week":
            parsed = _parse_year_week(text)
            if parsed is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Expected year-week format (YYYY-W##).")
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint="week")
        if single_profile == "quarter":
            parsed = _parse_quarter(text)
            if parsed is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Expected quarter format (YYYY-Q# or Q#-YYYY).")
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint="quarter")
        if single_profile == "token":
            start, end, bucket = _parse_token(text, now)
            if start is None:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Unsupported period token.")
            return TimeParseResult(
                ok=True,
                profile_used=single_profile,
                time_start=_iso(start),
                time_end=_iso(end) if end else None,
                bucket_hint=bucket or "period",
                warning="Token-based period parsed heuristically.",
            )
        if single_profile == "custom":
            if not time_format:
                return TimeParseResult(ok=False, profile_used=single_profile, error="time_format is required for custom profile.")
            try:
                parsed = datetime.strptime(text, time_format)
            except ValueError:
                return TimeParseResult(ok=False, profile_used=single_profile, error="Value does not match custom time_format.")
            return TimeParseResult(ok=True, profile_used=single_profile, time_start=_iso(parsed), bucket_hint="custom")
        return TimeParseResult(ok=False, profile_used=single_profile, error=f"Unsupported profile: {single_profile}")

    if profile == "date_range":
        start_raw = raw_value
        end_raw = time_end_value
        if isinstance(raw_value, list) and raw_value:
            start_raw = raw_value[0]
            end_raw = raw_value[-1] if len(raw_value) > 1 else time_end_value
        elif isinstance(raw_value, dict):
            start_raw = raw_value.get("start") or raw_value.get("from")
            end_raw = raw_value.get("end") or raw_value.get("to") or time_end_value
        elif isinstance(raw_value, str):
            if ".." in raw_value:
                left, right = raw_value.split("..", 1)
                start_raw, end_raw = left.strip(), right.strip()
            elif " to " in raw_value.lower():
                parts = re.split(r"\s+to\s+", raw_value, maxsplit=1, flags=re.IGNORECASE)
                if len(parts) == 2:
                    start_raw, end_raw = parts[0].strip(), parts[1].strip()
        start_dt = _as_datetime(start_raw)
        end_dt = _as_datetime(end_raw)
        if start_dt is None or end_dt is None:
            return TimeParseResult(ok=False, profile_used=profile, error="Could not parse date range start/end.")
        return TimeParseResult(ok=True, profile_used=profile, time_start=_iso(start_dt), time_end=_iso(end_dt), bucket_hint="range")

    if profile == "date_list":
        values = raw_value if isinstance(raw_value, list) else [raw_value]
        parsed_values = [_as_datetime(item) for item in values]
        parsed_values = [item for item in parsed_values if item is not None]
        if not parsed_values:
            return TimeParseResult(ok=False, profile_used=profile, error="Could not parse any date in list.")
        if extraction_rule == "last":
            selected = parsed_values[-1]
        elif extraction_rule == "first":
            selected = parsed_values[0]
        elif extraction_rule == "range" and len(parsed_values) >= 2:
            return TimeParseResult(
                ok=True,
                profile_used=profile,
                time_start=_iso(parsed_values[0]),
                time_end=_iso(parsed_values[-1]),
                bucket_hint="list_range",
            )
        else:
            selected = parsed_values[0]
        return TimeParseResult(ok=True, profile_used=profile, time_start=_iso(selected), bucket_hint="list")

    if isinstance(raw_value, list):
        if extraction_rule == "last":
            raw_value = raw_value[-1] if raw_value else None
        elif extraction_rule == "range":
            return _parse_profile_value(
                raw_value,
                "date_range",
                extraction_rule,
                time_end_value=time_end_value,
                time_format=time_format,
                now=now,
            )
        else:
            raw_value = raw_value[0] if raw_value else None

    if profile == "auto":
        for candidate in (
            "iso_datetime",
            "iso_date",
            "unix_millis",
            "unix_seconds",
            "year_week",
            "year_month",
            "quarter",
            "year",
            "token",
        ):
            parsed = _parse_single(raw_value, candidate)
            if parsed.ok:
                return parsed
        return TimeParseResult(ok=False, profile_used="auto", error="Could not infer time profile from value.")

    return _parse_single(raw_value, profile)


def preview_time_mapping(
    *,
    rows: list[dict[str, Any]],
    time_field: str | None,
    time_end_field: str | None = None,
    time_profile: str = "auto",
    time_extraction_rule: str = "single",
    time_format: str | None = None,
    sample_rows_limit: int = 5,
) -> dict[str, Any]:
    limited_rows = rows[: max(1, min(int(sample_rows_limit or 5), 20))]
    parsed_rows: list[dict[str, Any]] = []
    warnings: list[str] = []
    errors: list[str] = []
    success_count = 0
    warning_count = 0
    failure_count = 0
    bucket_counts: dict[str, int] = {}
    now = datetime.now(timezone.utc)

    if not limited_rows:
        return {
            "sample_count": 0,
            "parsed_rows": [],
            "summary": {
                "success_count": 0,
                "warning_count": 0,
                "failure_count": 0,
                "confidence": 0,
                "detected_granularity": None,
                "warnings": ["No rows available for mapping preview."],
                "errors": [],
            },
        }

    for index, row in enumerate(limited_rows):
        raw_time = _resolve_path_value(row, time_field) if time_field else None
        raw_end = _resolve_path_value(row, time_end_field) if time_end_field else None
        parsed = _parse_profile_value(
            raw_time,
            time_profile,
            time_extraction_rule,
            time_end_value=raw_end,
            time_format=time_format,
            now=now,
        ) if time_field else TimeParseResult(ok=False, profile_used=time_profile, error="time_field is required.")

        status = "ok"
        message = None
        if parsed.ok:
            success_count += 1
            if parsed.warning:
                warning_count += 1
                warnings.append(parsed.warning)
                status = "warning"
                message = parsed.warning
            if parsed.bucket_hint:
                bucket_counts[parsed.bucket_hint] = bucket_counts.get(parsed.bucket_hint, 0) + 1
        else:
            failure_count += 1
            status = "error"
            message = parsed.error or "Could not parse time value."
            errors.append(message)

        parsed_rows.append(
            {
                "row_index": index,
                "raw_time": raw_time,
                "raw_time_end": raw_end if time_end_field else None,
                "time_start": parsed.time_start,
                "time_end": parsed.time_end,
                "profile_used": parsed.profile_used,
                "bucket_hint": parsed.bucket_hint,
                "status": status,
                "message": message,
            }
        )

    total = len(limited_rows)
    confidence = int(round(((success_count + (0.5 * warning_count)) / max(total, 1)) * 100))
    detected_granularity = None
    if bucket_counts:
        detected_granularity = sorted(bucket_counts.items(), key=lambda item: item[1], reverse=True)[0][0]

    return {
        "sample_count": total,
        "parsed_rows": parsed_rows,
        "summary": {
            "success_count": success_count,
            "warning_count": warning_count,
            "failure_count": failure_count,
            "confidence": max(0, min(100, confidence)),
            "detected_granularity": detected_granularity,
            "warnings": sorted(set(warnings)),
            "errors": sorted(set(errors)),
        },
    }
