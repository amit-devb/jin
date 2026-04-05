import json
import os
import time
from pathlib import Path
from jin.core.license import CommercialEntitlementProvider, CommercialEntitlementStore, LicenseClient, LicensePolicy, MerchantProvider

def test_license_policy_defaults():
    policy = LicensePolicy()
    assert policy.tier == "free"
    assert policy.features == []
    assert policy.max_projects == 1

def test_merchant_provider_mocking():
    provider = MerchantProvider()
    
    # Valid Business key
    result = provider.verify_license("BUS-ACME-12345", "test-site")
    assert result["success"] is True
    assert result["policy"]["tier"] == "business"
    assert result["policy"]["max_projects"] is None
    assert result["organization_id"] == "acme"
    assert result["account_id"]
    assert "pdf_reports" in result["policy"]["features"]
    assert "token" in result
    
    # Invalid key
    bad_result = provider.verify_license("FREE-123", "test-site")
    assert bad_result["success"] is False
    assert bad_result["error"] == "Invalid license key"


def test_commercial_entitlement_catalog_round_trip(tmp_path: Path):
    catalog_path = tmp_path / "catalog.json"
    store = CommercialEntitlementStore(catalog_path)
    store.issue_license(
        "BUS-ACME-ENT-001",
        organization_id="acme",
        account_id="acct-001",
        policy={"tier": "business", "max_projects": None, "features": ["ai_chat"]},
        site_id="site-123",
        allowed_site_ids=["site-123"],
        message="Commercial entitlement activated",
    )

    provider = CommercialEntitlementProvider(catalog_path=str(catalog_path))
    assert provider.backend_mode() == "commercial_catalog"
    result = provider.verify_license("BUS-ACME-ENT-001", "site-123")
    assert result["success"] is True
    assert result["source"] == "commercial_catalog"
    assert result["policy"]["tier"] == "business"
    assert result["organization_id"] == "acme"
    assert result["account_id"] == "acct-001"

    client = LicenseClient(
        storage_path=str(tmp_path / "license.json"),
        usage_path=str(tmp_path / "usage.json"),
        org_registry_path=str(tmp_path / "orgs.json"),
    )
    client.provider = provider
    activated = client.activate("BUS-ACME-ENT-001", "site-123")
    assert activated["success"] is True
    assert activated["source"] == "commercial_catalog"
    assert client.has_commercial_catalog() is True

def test_license_client_usage_tracking(tmp_path: Path):
    usage_file = tmp_path / "usage.json"
    client = LicenseClient(usage_path=str(usage_file), storage_path=str(tmp_path / "license.json"))
    
    # Initial usage should be 0
    assert client.get_current_usage() == 0
    assert client.check_usage() is True
    
    # Increment usage
    client.increment_usage(500)
    assert client.get_current_usage() == 500
    assert client.check_usage() is True
    
    # Increment past limit
    client.increment_usage(600)
    assert client.get_current_usage() == 1100
    assert client.check_usage() is True
    
    # Check creating usage directory
    os.remove(str(usage_file))
    nested_usage = tmp_path / "nested" / "usage.json"
    nested_client = LicenseClient(usage_path=str(nested_usage), storage_path=str(tmp_path / "license.json"))
    nested_client.increment_usage(10)
    assert nested_client.get_current_usage() == 10
    
def test_license_client_load_from_storage(tmp_path: Path):
    storage_file = tmp_path / "license.json"
    valid_data = {
        "last_check": time.time(),
        "policy": {
            "tier": "business",
            "max_projects": 3,
            "features": ["ai_chat"],
            "min_version": "0.1.0",
            "force_upgrade": False,
            "message": None
        }
    }
    storage_file.write_text(json.dumps(valid_data))
    
    client = LicenseClient(storage_path=str(storage_file), usage_path=str(tmp_path / "usage.json"))
    policy = client.get_policy()
    
    assert policy.tier == "business"
    assert policy.max_projects is None
    assert policy.features == ["ai_chat"]

def test_license_client_resets_on_invalid_storage(tmp_path: Path):
    storage_file = tmp_path / "invalid_license.json"
    storage_file.write_text("not real json")
    
    client = LicenseClient(storage_path=str(storage_file), usage_path=str(tmp_path / "usage.json"))
    policy = client.get_policy()
    
    # Should fall back to defaults
    assert policy.tier == "free"

def test_license_client_save_to_storage(tmp_path: Path):
    storage_file = tmp_path / "save_license.json"
    client = LicenseClient(storage_path=str(storage_file), usage_path=str(tmp_path / "usage.json"))
    
    new_policy = LicensePolicy(tier="business", max_projects=None, features=["custom_domain"])
    client._current_policy = new_policy
    valid_policy = {
        "tier": "business",
        "max_projects": None,
        "features": ["custom_domain"],
        "min_version": "0.1.0",
        "force_upgrade": False,
        "message": None
    }
    client._save_local_license(valid_policy, "saved")
    
    assert storage_file.exists()
    saved_data = json.loads(storage_file.read_text())
    assert saved_data["policy"]["tier"] == "business"

def test_license_client_activate(tmp_path: Path):
    client = LicenseClient(
        storage_path=str(tmp_path / "act_license.json"),
        usage_path=str(tmp_path / "usage.json"),
        org_registry_path=str(tmp_path / "organizations.json"),
    )
    
    success = client.activate("BUS-ACME-TEST", "site-123")
    assert success["success"] is True
    assert client.get_policy().tier == "business"
    
    fail = client.activate("INVALID", "site-123")
    assert fail["success"] is False


def test_license_client_rejects_second_account_for_same_org(tmp_path: Path):
    org_registry = tmp_path / "organizations.json"
    first = LicenseClient(
        storage_path=str(tmp_path / "first-license.json"),
        usage_path=str(tmp_path / "first-usage.json"),
        org_registry_path=str(org_registry),
    )
    second = LicenseClient(
        storage_path=str(tmp_path / "second-license.json"),
        usage_path=str(tmp_path / "second-usage.json"),
        org_registry_path=str(org_registry),
    )
    ok = first.activate("BUS-ACME-ONE", "site-a")
    assert ok["success"] is True
    rejected = second.activate("BUS-ACME-TWO", "site-b")
    assert rejected["success"] is False
    assert "already has an account" in rejected["error"]
