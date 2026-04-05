import json
import hmac
import os
import time
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict, field

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


def _license_key_hash(key: str) -> str:
    return hashlib.sha256(str(key or "").strip().encode("utf-8")).hexdigest()


@dataclass
class CommercialEntitlementRecord:
    license_key_hash: str
    organization_id: str
    account_id: str
    policy: dict[str, Any] = field(default_factory=dict)
    license_id: str | None = None
    site_id: str | None = None
    allowed_site_ids: list[str] = field(default_factory=list)
    issued_at: float = field(default_factory=time.time)
    expires_at: float | None = None
    revoked_at: float | None = None
    source: str = "commercial_catalog"
    message: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["allowed_site_ids"] = [str(item) for item in self.allowed_site_ids if str(item).strip()]
        payload["policy"] = LicenseClient._normalize_policy(self.policy)
        payload["metadata"] = dict(self.metadata or {})
        return payload


class CommercialEntitlementStore:
    def __init__(self, catalog_path: str | Path) -> None:
        self.catalog_path = Path(catalog_path).expanduser().resolve()

    def has_catalog(self) -> bool:
        return self.catalog_path.exists()

    def _load_payload(self) -> dict[str, Any]:
        if not self.catalog_path.exists():
            return {"licenses": []}
        try:
            payload = json.loads(self.catalog_path.read_text())
        except Exception:
            return {"licenses": []}
        if isinstance(payload, list):
            return {"licenses": payload}
        if isinstance(payload, dict):
            licenses = payload.get("licenses")
            if isinstance(licenses, list):
                return {"licenses": licenses}
        return {"licenses": []}

    def _save_payload(self, payload: dict[str, Any]) -> None:
        self.catalog_path.parent.mkdir(parents=True, exist_ok=True)
        self.catalog_path.write_text(json.dumps(payload, indent=2, sort_keys=True))

    def list_licenses(self) -> list[dict[str, Any]]:
        payload = self._load_payload()
        licenses = payload.get("licenses")
        return [dict(item) for item in licenses if isinstance(item, dict)]

    def find_license(self, key: str) -> dict[str, Any] | None:
        key_hash = _license_key_hash(key)
        for record in self.list_licenses():
            record_hash = str(record.get("license_key_hash") or record.get("key_hash") or "").strip()
            record_key = str(record.get("license_key") or "").strip()
            if record_hash == key_hash or (record_key and record_key == str(key).strip()):
                return record
        return None

    def issue_license(
        self,
        key: str,
        *,
        organization_id: str,
        account_id: str,
        policy: dict[str, Any],
        site_id: str | None = None,
        allowed_site_ids: list[str] | None = None,
        expires_at: float | None = None,
        message: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        record = CommercialEntitlementRecord(
            license_key_hash=_license_key_hash(key),
            organization_id=str(organization_id),
            account_id=str(account_id),
            policy=LicenseClient._normalize_policy(policy),
            license_id=hashlib.sha256(f"{organization_id}|{account_id}|{key}".encode("utf-8")).hexdigest()[:16],
            site_id=str(site_id).strip() or None,
            allowed_site_ids=[str(item).strip() for item in (allowed_site_ids or []) if str(item).strip()],
            expires_at=expires_at,
            message=message,
            metadata=metadata or {},
        )
        payload = self._load_payload()
        licenses = [item for item in payload.get("licenses", []) if isinstance(item, dict)]
        licenses = [
            item
            for item in licenses
            if str(item.get("license_key_hash") or "").strip() != record.license_key_hash
        ]
        licenses.append(record.to_payload())
        payload["licenses"] = licenses
        payload["updated_at"] = time.time()
        self._save_payload(payload)
        return record.to_payload()

    def revoke_license(self, key: str) -> dict[str, Any] | None:
        payload = self._load_payload()
        licenses = [item for item in payload.get("licenses", []) if isinstance(item, dict)]
        key_hash = _license_key_hash(key)
        changed = False
        updated: list[dict[str, Any]] = []
        revoked_record: dict[str, Any] | None = None
        for record in licenses:
            record_hash = str(record.get("license_key_hash") or "").strip()
            if record_hash != key_hash:
                updated.append(record)
                continue
            changed = True
            record["revoked_at"] = time.time()
            revoked_record = dict(record)
            updated.append(record)
        if changed:
            payload["licenses"] = updated
            payload["updated_at"] = time.time()
            self._save_payload(payload)
        return revoked_record

class InternalDemoLicenseProvider(BaseLicenseProvider):
    """
    Phase 1 internal demo provider.

    This intentionally simulates a merchant-backed licensing flow without making
    any external network calls. Keep it internal-only until Jin has a real
    entitlement backend.
    """
    def verify_license(self, key: str, site_id: str) -> Dict[str, Any]:
        # TODO: Replace with a real merchant / entitlement backend.
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


class CommercialEntitlementProvider(BaseLicenseProvider):
    def __init__(
        self,
        catalog_path: str | None = None,
        *,
        signing_secret: str | None = None,
        allow_legacy_demo_fallback: bool = True,
    ) -> None:
        configured_path = catalog_path or os.getenv("JIN_LICENSE_CATALOG_PATH")
        if configured_path:
            self.catalog_path = str(Path(configured_path).expanduser().resolve())
        else:
            self.catalog_path = str(Path.home() / ".jin" / "licenses.json")
        self.catalog = CommercialEntitlementStore(self.catalog_path)
        self.signing_secret = signing_secret or os.getenv("JIN_LICENSE_SIGNING_SECRET") or hashlib.sha256(
            f"{self.catalog_path}|jin-license-signing".encode("utf-8")
        ).hexdigest()
        self.allow_legacy_demo_fallback = allow_legacy_demo_fallback and not bool(configured_path)
        self._legacy_demo_provider = InternalDemoLicenseProvider()

    def backend_mode(self) -> str:
        return "commercial_catalog" if self.catalog.has_catalog() else "legacy_demo"

    def _sign_activation(self, payload: dict[str, Any]) -> str:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        digest = hmac.new(
            self.signing_secret.encode("utf-8"),
            canonical.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return f"jin-entitlement-{digest[:24]}"

    def _commercial_response(self, key: str, site_id: str, record: dict[str, Any]) -> Dict[str, Any]:
        revoked_at = record.get("revoked_at")
        if revoked_at:
            return {"success": False, "error": "License key has been revoked"}
        expires_at = record.get("expires_at")
        if expires_at is not None:
            try:
                if time.time() > float(expires_at):
                    return {"success": False, "error": "License key has expired"}
            except Exception:
                return {"success": False, "error": "License record is invalid"}

        allowed_site_ids = [
            str(item).strip()
            for item in (record.get("allowed_site_ids") or [])
            if str(item).strip()
        ]
        bound_site_id = str(record.get("site_id") or "").strip()
        current_site_id = str(site_id or "").strip()
        if allowed_site_ids and current_site_id not in allowed_site_ids:
            return {"success": False, "error": "License key is not valid for this site"}
        if bound_site_id and current_site_id and bound_site_id != current_site_id:
            return {"success": False, "error": "License key is bound to a different site"}

        policy = LicenseClient._normalize_policy(record.get("policy", {}))
        organization_id = str(record.get("organization_id") or "").strip() or f"org-{current_site_id or 'local'}"
        account_id = str(record.get("account_id") or "").strip() or hashlib.sha256(
            f"{organization_id}|{key}".encode("utf-8")
        ).hexdigest()[:12]
        activation_payload = {
            "license_id": record.get("license_id") or _license_key_hash(key)[:16],
            "license_key_hash": _license_key_hash(key),
            "organization_id": organization_id,
            "account_id": account_id,
            "site_id": current_site_id,
            "policy": policy,
            "issued_at": record.get("issued_at"),
            "expires_at": expires_at,
        }
        return {
            "success": True,
            "policy": policy,
            "organization_id": organization_id,
            "account_id": account_id,
            "source": "commercial_catalog",
            "license_id": activation_payload["license_id"],
            "token": self._sign_activation(activation_payload),
            "message": record.get("message"),
            "expires_at": expires_at,
        }

    def verify_license(self, key: str, site_id: str) -> Dict[str, Any]:
        normalized_key = str(key or "").strip()
        if not normalized_key:
            return {"success": False, "error": "Invalid license key"}

        record = self.catalog.find_license(normalized_key)
        if record:
            return self._commercial_response(normalized_key, site_id, record)

        if self.allow_legacy_demo_fallback and normalized_key.startswith("BUS-"):
            response = self._legacy_demo_provider.verify_license(normalized_key, site_id)
            if response.get("success"):
                response["source"] = "legacy_demo"
            return response

        if self.catalog.has_catalog():
            return {"success": False, "error": "License key not found in entitlement catalog"}
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
        self.provider = CommercialEntitlementProvider()
        self._current_policy = LicensePolicy()
        self._organization_id: Optional[str] = None
        self._account_id: Optional[str] = None
        self._license_source: Optional[str] = None
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
                        self._license_source = data.get("source")
        except Exception:
            pass

    def _save_local_license(
        self,
        policy: Dict[str, Any],
        token: str,
        organization_id: str | None = None,
        account_id: str | None = None,
        source: str | None = None,
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
                    "source": source or self._license_source or getattr(self.provider, "backend_mode", lambda: "commercial_catalog")(),
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
            self._license_source = str(result.get("source") or self._license_source or getattr(self.provider, "backend_mode", lambda: "commercial_catalog")())
            self._save_local_license(
                policy_data,
                result.get("token", ""),
                organization_id=self._organization_id,
                account_id=self._account_id,
                source=self._license_source,
            )
            return {
                "success": True,
                "policy": asdict(self._current_policy),
                "organization_id": self._organization_id,
                "account_id": self._account_id,
                "source": self._license_source,
            }
        return {"success": False, "error": result.get("error", "Verification failed")}

    def get_policy(self) -> LicensePolicy:
        return self._current_policy

    def backend_mode(self) -> str:
        backend = getattr(self.provider, "backend_mode", None)
        if callable(backend):
            try:
                return str(backend())
            except Exception:
                return "commercial_catalog"
        return "commercial_catalog"

    def has_commercial_catalog(self) -> bool:
        catalog = getattr(self.provider, "catalog", None)
        if catalog and hasattr(catalog, "has_catalog"):
            try:
                return bool(catalog.has_catalog())
            except Exception:
                return False
        return False

    def get_account_scope(self, fallback_site_id: str | None = None) -> str:
        scope = self._account_id or self._organization_id or fallback_site_id or "local"
        return str(scope)

    def is_pro(self) -> bool:
        # Backward-compatible alias.
        return self._current_policy.tier == "business"


# Backward-compatible alias for older imports and tests.
MerchantProvider = CommercialEntitlementProvider
