import uuid
import hashlib
from app.extensions import db


def _generate_key():
    """Generate a new API key string and return (key_string, key_hash, key_prefix)."""
    raw = str(uuid.uuid4())
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    key_prefix = raw[:8]
    return f"b2h_{raw}", key_hash, key_prefix


class PlatformApiKeyController:
    @staticmethod
    def list_keys(db, platform_id=None):
        from app.models import PlatformApiKey
        from app.utils.serializers import to_dict
        query = db.session.query(PlatformApiKey)
        if platform_id:
            query = query.filter(PlatformApiKey.platform_id == platform_id)
        keys = query.order_by(PlatformApiKey.created_at.desc()).all()
        result = []
        for k in keys:
            d = to_dict(k) or {}
            d.pop("key_hash", None)
            result.append(d)
        return result

    @staticmethod
    def create_key(db, payload: dict):
        from app.models import PlatformApiKey
        from app.utils.serializers import to_dict
        from app.models import PlatformType
        required = ("platform_id", "name")
        if not all(k in payload for k in required):
            raise ValueError("platform_id, name required")
        plat = db.session.get(PlatformType, payload["platform_id"])
        if not plat:
            raise ValueError("platform not found")
        key_str, key_hash, key_prefix = _generate_key()
        k = PlatformApiKey()
        k.platform_id = payload["platform_id"]
        k.name = payload["name"]
        k.key_hash = key_hash
        k.key_prefix = key_prefix
        k.scopes = payload.get("scopes", ["actions:create", "rates:create", "rates:update"])
        db.session.add(k)
        db.session.commit()
        result = to_dict(k) or {}
        result["key"] = key_str
        return result

    @staticmethod
    def get_key_by_string(db, key_string: str):
        from app.models import PlatformApiKey
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()
        k = db.session.query(PlatformApiKey).filter(
            PlatformApiKey.key_hash == key_hash,
            PlatformApiKey.is_active == True
        ).first()
        if not k:
            raise ValueError("invalid or inactive key")
        k.last_used_at = db.func.now()
        db.session.commit()
        return k

    @staticmethod
    def create_key_for_platform(db, platform_id, name, scopes=None, revoke_existing=False):
        from app.models import PlatformType, PlatformApiKey
        if not db.session.get(PlatformType, platform_id):
            raise ValueError("platform not found")
        if revoke_existing:
            db.session.query(PlatformApiKey).filter(
                PlatformApiKey.platform_id == platform_id,
                PlatformApiKey.is_active == True
            ).update({"is_active": False})
        return PlatformApiKeyController.create_key(db, {
            "platform_id": platform_id,
            "name": name,
            "scopes": scopes or ["actions:create", "rates:create", "rates:update"],
        })

    @staticmethod
    def regenerate_key(db, platform_id, name=None, scopes=None, revoke_existing=False):
        from app.models import PlatformApiKey
        existing = db.session.query(PlatformApiKey).filter(
            PlatformApiKey.platform_id == platform_id,
            PlatformApiKey.is_active == True
        ).count()
        if not existing:
            raise ValueError("no active API key exists for this platform")
        key_name = name or "Regenerated Integration Key"
        return PlatformApiKeyController.create_key_for_platform(
            db,
            platform_id,
            key_name,
            scopes=scopes,
            revoke_existing=revoke_existing,
        )

    @staticmethod
    def delete_key(db, key_id):
        from app.models import PlatformApiKey
        k = db.session.get(PlatformApiKey, key_id)
        if not k:
            raise ValueError("not found")
        k.is_active = False
        db.session.commit()
        return dict(deleted=True)

    @staticmethod
    def verify_key(db, key_string):
        from app.models import PlatformApiKey
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()
        k = db.session.query(PlatformApiKey).filter(
            PlatformApiKey.key_hash == key_hash,
            PlatformApiKey.is_active == True
        ).first()
        return k

