from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

TECHNICAL_METADATA_FIELDS = {"api_version", "label", "timestamp", "_jin_id"}


def default_technical_metadata_value(field: str, app_version: str | None = None) -> str:
    """Provide sane defaults when a technical metadata dimension is missing."""
    if field == "api_version":
        return app_version or "latest"
    if field == "label":
        return "current"
    if field == "timestamp":
        return datetime.now(timezone.utc).isoformat()
    if field == "_jin_id":
        return str(uuid4())
    return ""
