from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

class WebhookNotificationClient:
    def __init__(self, webhook_url: str | None = None) -> None:
        self.webhook_url = webhook_url or os.getenv("JIN_WEBHOOK_URL", "")

    def is_enabled(self) -> bool:
        return bool(self.webhook_url)

    def send_incident_alert(self, endpoint_path: str, issue: dict[str, Any]) -> bool:
        if not self.is_enabled():
            return False
            
        kpi_field = issue.get("kpi_field", "Unknown KPI")
        expected_value = issue.get("expected_value", "Unknown")
        actual_value = issue.get("actual_value", "Unknown")
        pct_change_raw = issue.get("pct_change", 0.0)
        
        try:
            pct_change = float(pct_change_raw) if pct_change_raw is not None else 0.0
        except (ValueError, TypeError):
            pct_change = 0.0
            
        if abs(pct_change) < 15.0 and os.getenv("JIN_WEBHOOK_ALL") != "1":
            return False

        message = (
            f"🚨 *Jin Alert: Mismatch on {endpoint_path}*\n"
            f"The metric `{kpi_field}` drifted by *{pct_change:.2f}%*.\n"
            f"• *Expected*: {expected_value}\n"
            f"• *Actual*: {actual_value}\n\n"
            f"_(Review this issue in the Jin Dashboard)_"
        )

        payload = {"text": message}

        try:
            req = urllib.request.Request(
                self.webhook_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5.0) as _:
                pass
            return True
        except urllib.error.URLError as e:
            logger.error("Failed to send webhook notification: %s", e)
            return False
        except Exception as e:
            logger.error("Unexpected error sending webhook: %s", e)
            return False
