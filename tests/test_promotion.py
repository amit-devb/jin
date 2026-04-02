import json
import pytest
from fastapi.testclient import TestClient
import jin.router as router_module

def test_promote_baseline_endpoint(client) -> None:
    # Mock native core
    orig_promote = router_module.promote_baseline
    def mock_promote(db, path):
        return json.dumps({"status": "success", "promoted": 42})
    
    router_module.promote_baseline = mock_promote
    
    try:
        # Path: /api/sales/{retailer}/{period} -> encoded
        path_arg = "api/sales/%7Bretailer%7D/%7Bperiod%7D"
        response = client.post(f"/jin/api/promote-baseline/{path_arg}")
        assert response.status_code == 200
        assert response.json()["promoted"] == 42
        
        # Test error case
        def mock_error(db, path):
            raise RuntimeError("native failed")
        
        router_module.promote_baseline = mock_error
        response = client.post(f"/jin/api/promote-baseline/{path_arg}")
        assert response.status_code == 500
        assert "native failed" in response.json()["message"]

    finally:
        router_module.promote_baseline = orig_promote

def test_promote_baseline_no_native(client) -> None:
    orig_promote = router_module.promote_baseline
    router_module.promote_baseline = None
    try:
        path_arg = "api/test"
        response = client.post(f"/jin/api/promote-baseline/{path_arg}")
        assert response.status_code == 400
        assert "Native core required" in response.json()["message"]
    finally:
        router_module.promote_baseline = orig_promote
