import json
import os
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict

@dataclass
class LicensePolicy:
    tier: str = "free"
    # None means unlimited projects.
    max_projects: Optional[int] = 1
    features: List[str] = None
    min_version: str = "0.1.0"
    force_upgrade: bool = False
    message: Optional[str] = None

    def __post_init__(self):
        if self.features is None:
            self.features = []

class BaseLicenseProvider(ABC):
    @abstractmethod
    def verify_license(self, key: str, site_id: str) -> Dict[str, Any]:
        """Verify key against provider and return policy/token info."""
        pass

class MerchantProvider(BaseLicenseProvider):
    """
    Implementation for Path A: High-level merchant (e.g. Lemon Squeezy).
    For now, this provides a mock response that simulates a merchant API.
    """
    def verify_license(self, key: str, site_id: str) -> Dict[str, Any]:
        # TODO: Implement real requests.post call to Merchant API.
        # For now, simulate a successful verification for any key starting with 'BUS-'.
        if key.startswith("BUS-"):
            parts = [part for part in key.split("-") if part]
            organization_id = str(parts[1]).lower() if len(parts) >= 3 else f"org-{site_id}"
            account_id = hashlib.sha256(f"{organization_id}|{key}".encode("utf-8")).hexdigest()[:12]
            return {
                "success": True,
                "policy": {
                    "tier": "business",
                    "max_projects": None,
                    "features": ["ai_chat", "slack_alerts", "pdf_reports"]
                },
                "organization_id": organization_id,
                "account_id": account_id,
                "token": f"mock_signed_token_{int(time.time())}",
            }
        return {"success": False, "error": "Invalid license key"}

class LicenseClient:
    def __init__(
        self,
        storage_path: Optional[str] = None,
        usage_path: Optional[str] = None,
        org_registry_path: Optional[str] = None,
    ):
        self.storage_path = storage_path or str(Path.home() / ".jin" / "license.json")
        self.usage_path = usage_path or str(Path.home() / ".jin" / "usage.json")
        self.org_registry_path = org_registry_path or str(Path.home() / ".jin" / "organizations.json")
        self.provider = MerchantProvider() # Default to Merchant Path A
        self._current_policy = LicensePolicy()
        self._organization_id: Optional[str] = None
        self._account_id: Optional[str] = None
        self._load_local_license()

    @staticmethod
    def _normalize_policy(policy: Dict[str, Any] | None) -> Dict[str, Any]:
        payload = dict(policy or {})
        tier = str(payload.get("tier") or "free").strip().lower()
        if tier in {"starter", "community"}:
            tier = "free"
        if tier in {"pro", "enterprise"}:
            tier = "business"
        if tier not in {"free", "business"}:
            tier = "free"
        payload["tier"] = tier
        if tier == "business":
            payload["max_projects"] = None
        else:
            raw_limit = payload.get("max_projects")
            try:
                normalized_limit = int(raw_limit) if raw_limit is not None else 1
            except Exception:
                normalized_limit = 1
            payload["max_projects"] = max(1, min(1, normalized_limit))
        features = payload.get("features")
        if not isinstance(features, list):
            payload["features"] = []
        payload.pop("monthly_runs_limit", None)
        return payload

    @staticmethod
    def _policy_from_payload(policy: Dict[str, Any] | None) -> LicensePolicy:
        normalized = LicenseClient._normalize_policy(policy)
        allowed = {field: normalized[field] for field in LicensePolicy.__dataclass_fields__ if field in normalized}
        return LicensePolicy(**allowed)

    def _get_usage_key(self) -> str:
        """Returns the current month key, e.g., '2026-03'."""
        return time.strftime("%Y-%m")

    def get_current_usage(self) -> int:
        """Returns the current month's run count."""
        try:
            if os.path.exists(self.usage_path):
                with open(self.usage_path, "r") as f:
                    data = json.load(f)
                    return data.get(self._get_usage_key(), 0)
        except Exception:
            pass
        return 0

    def increment_usage(self, count: int = 1):
        """Increments the current month's run count."""
        try:
            os.makedirs(os.path.dirname(self.usage_path), exist_ok=True)
            usage = {}
            if os.path.exists(self.usage_path):
                with open(self.usage_path, "r") as f:
                    usage = json.load(f)
            
            key = self._get_usage_key()
            usage[key] = usage.get(key, 0) + count
            
            with open(self.usage_path, "w") as f:
                json.dump(usage, f)
        except Exception: # pragma: no cover
            pass

    def check_usage(self) -> bool:
        """Usage is informational only in the local/self-hosted model."""
        return True

    def _load_local_license(self):
        """Loads cached license from disk if it exists and is fresh."""
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, "r") as f:
                    data = json.load(f)
                    # Simple 7-day grace period check
                    if time.time() - data.get("last_check", 0) < 604800:
                        self._current_policy = self._policy_from_payload(data.get("policy", {}))
                        self._organization_id = data.get("organization_id")
                        self._account_id = data.get("account_id")
        except Exception:
            pass

    def _save_local_license(
        self,
        policy: Dict[str, Any],
        token: str,
        organization_id: str | None = None,
        account_id: str | None = None,
    ):
        """Caches the verified policy and token."""
        try:
            normalized_policy = self._normalize_policy(policy)
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            with open(self.storage_path, "w") as f:
                json.dump({
                    "last_check": time.time(),
                    "policy": normalized_policy,
                    "token": token,
                    "organization_id": organization_id,
                    "account_id": account_id,
                }, f)
        except Exception:
            pass

    def _bind_organization(self, organization_id: str | None, account_id: str | None) -> Dict[str, Any]:
        if not organization_id or not account_id:
            return {"ok": True}
        try:
            registry_path = Path(self.org_registry_path)
            registry_path.parent.mkdir(parents=True, exist_ok=True)
            registry: Dict[str, Any] = {}
            if registry_path.exists():
                try:
                    loaded = json.loads(registry_path.read_text())
                    if isinstance(loaded, dict):
                        registry = loaded
                except Exception:
                    registry = {}
            existing = registry.get(organization_id)
            if isinstance(existing, dict):
                existing_account = str(existing.get("account_id") or "")
                if existing_account and existing_account != account_id:
                    return {"ok": False, "error": "Organization already has an account. Use the existing account license key."}
            registry[organization_id] = {"account_id": account_id}
            registry_path.write_text(json.dumps(registry, indent=2))
            return {"ok": True}
        except Exception:
            # Local filesystem issues should not block license activation.
            return {"ok": True}

    def activate(self, key: str, site_id: str) -> Dict[str, Any]:
        """Attempts to activate a new license key."""
        result = self.provider.verify_license(key, site_id)
        if result.get("success"):
            organization_id = result.get("organization_id")
            account_id = result.get("account_id")
            binding = self._bind_organization(
                str(organization_id) if organization_id is not None else None,
                str(account_id) if account_id is not None else None,
            )
            if not binding.get("ok"):
                return {"success": False, "error": str(binding.get("error") or "Organization binding failed")}
            policy_data = self._normalize_policy(result.get("policy", {}))
            self._current_policy = self._policy_from_payload(policy_data)
            self._organization_id = str(organization_id) if organization_id is not None else None
            self._account_id = str(account_id) if account_id is not None else None
            self._save_local_license(
                policy_data,
                result.get("token", ""),
                organization_id=self._organization_id,
                account_id=self._account_id,
            )
            return {
                "success": True,
                "policy": asdict(self._current_policy),
                "organization_id": self._organization_id,
                "account_id": self._account_id,
            }
        return {"success": False, "error": result.get("error", "Verification failed")}

    def get_policy(self) -> LicensePolicy:
        return self._current_policy

    def get_account_scope(self, fallback_site_id: str | None = None) -> str:
        scope = self._account_id or self._organization_id or fallback_site_id or "local"
        return str(scope)

    def is_pro(self) -> bool:
        # Backward-compatible alias.
        return self._current_policy.tier == "business"
