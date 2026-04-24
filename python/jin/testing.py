from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Any

from jin.middleware import JinMiddleware

class JinInspector:
    """
    A helper class for developers to use in CI/CD environments (like Pytest)
    to assert that recent API payloads match the Product Owner's references.
    """

    def __init__(self, db_path: str = "./jin.duckdb", app=None):
        self.db_path = db_path
        # Use JinMiddleware's utilities to grab storage safely
        self.middleware = JinMiddleware(app, db_path=db_path) if app else None

    # Load issues by reusing router logic wrapped in a simpler interface
    def get_active_issues(self, endpoint_path: str) -> list[dict[str, Any]]:
        try:
            import duckdb
        except ImportError:
            raise RuntimeError("DuckDB is required for Jin inspector assertions")

        conn = duckdb.connect(self.db_path)
        try:
            query = """
                SELECT a.id, a.endpoint_path, a.kpi_field, a.pct_change, s.incident_status
                FROM jin_issues a
                LEFT JOIN jin_issue_state s ON s.issue_id = a.id
                WHERE a.endpoint_path = ? AND a.is_active = true
            """
            rows = conn.execute(query, [endpoint_path]).fetchall()
            return [
                {
                    "id": row[0],
                    "endpoint_path": row[1],
                    "kpi_field": row[2],
                    "pct_change": row[3],
                    "status": row[4] or "active"
                }
                for row in rows
            ]
        finally:
            conn.close()

    def assert_no_drifts(self, endpoint_path: str) -> None:
        """
        Asserts that there are no active mismatches/drifts recorded in DuckDB for the given endpoint.
        Use this in Pytest after simulating user traffic via TestClient.
        """
        issues = self.get_active_issues(endpoint_path)
        unresolved = [i for i in issues if i["status"] != "resolved"]
        if unresolved:
            formatted_issues = ", ".join(f"{i['kpi_field']} ({i['pct_change']:.2f}%)" for i in unresolved)
            raise AssertionError(
                f"Data Quality Drift detected for '{endpoint_path}'. "
                f"Active issues: {formatted_issues}."
            )
