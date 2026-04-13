import os
import duckdb
import pytest

from jin.testing import JinInspector

def setup_test_db(db_path: str):
    conn = duckdb.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jin_issues (
            id BIGINT,
            endpoint_path VARCHAR,
            kpi_field VARCHAR,
            pct_change DOUBLE,
            is_active BOOLEAN
        );
        CREATE TABLE IF NOT EXISTS jin_issue_state (
            issue_id BIGINT,
            incident_status VARCHAR
        );
        INSERT INTO jin_issues VALUES (1, '/api/test', 'revenue', 15.5, true);
        INSERT INTO jin_issues VALUES (2, '/api/test', 'latency', 5.0, false);
    """)
    conn.close()

def test_inspector_active_issues(tmp_path):
    db_path = str(tmp_path / "test.duckdb")
    setup_test_db(db_path)

    inspector = JinInspector(db_path)
    issues = inspector.get_active_issues("/api/test")
    
    assert len(issues) == 1
    assert issues[0]["kpi_field"] == "revenue"
    assert issues[0]["pct_change"] == 15.5

def test_inspector_drifts_assertion(tmp_path):
    db_path = str(tmp_path / "test.duckdb")
    setup_test_db(db_path)

    inspector = JinInspector(db_path)
    
    # Should raise for /api/test
    with pytest.raises(AssertionError) as exc:
        inspector.assert_no_drifts("/api/test")
    assert "Data Quality Drift detected" in str(exc.value)
    assert "revenue (15.50%)" in str(exc.value)

    # Should not raise for unknown endpoint without issues
    inspector.assert_no_drifts("/api/clean")
