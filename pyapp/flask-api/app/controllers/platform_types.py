import uuid
import hashlib
import secrets
from app.extensions import db


def _generate_key():
    """Generate a new API key string and return (key_string, key_hash, key_prefix)."""
    raw = str(uuid.uuid4())
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    key_prefix = raw[:8]
    return f"b2h_{raw}", key_hash, key_prefix


def _generate_secret():
    """Generate a new webhook secret and return (secret, secret_hash, secret_prefix)."""
    raw = secrets.token_hex(32)
    secret_hash = hashlib.sha256(raw.encode()).hexdigest()
    secret_prefix = raw[:8]
    return f"whsec_{raw}", secret_hash, secret_prefix


class PlatformTypeController:
    @staticmethod
    def list_platform_types(db):
        from app.models import PlatformType
        from app.utils.serializers import to_dict
        platforms = db.session.query(PlatformType).order_by(PlatformType.sort_order).all()
        return [to_dict(p) for p in platforms]

    @staticmethod
    def get_platform_type(db, pt_id):
        from app.models import PlatformType
        from app.utils.serializers import to_dict
        pt = db.session.get(PlatformType, pt_id)
        if not pt:
            raise ValueError("not found")
        return to_dict(pt)

    @staticmethod
    def create_platform_type(db, payload: dict):
        from app.models import PlatformType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        secret, secret_hash, secret_prefix = _generate_secret()
        pt = PlatformType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            referral_url_template=payload.get("referral_url_template"),
            logo_url=payload.get("logo_url"),
            webhook_secret=secret,
            webhook_secret_hash=secret_hash,
            webhook_secret_prefix=secret_prefix,
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(pt)
        db.session.commit()
        return to_dict(pt)

    @staticmethod
    def update_platform_type(db, pt_id, payload: dict):
        from app.models import PlatformType
        from app.utils.serializers import to_dict
        pt = db.session.get(PlatformType, pt_id)
        if not pt:
            raise ValueError("not found")
        camel_to_snake = {"name": "name", "display_name": "display_name", "description": "description", "referral_url_template": "referral_url_template", "logoUrl": "logo_url", "logo_url": "logo_url", "sortOrder": "sort_order", "sort_order": "sort_order", "isActive": "is_active", "is_active": "is_active"}
        for field, col in camel_to_snake.items():
            if field in payload:
                setattr(pt, col, payload[field])
        db.session.commit()
        return to_dict(pt)

    @staticmethod
    def delete_platform_type(db, pt_id):
        from app.models import PlatformType
        from app.models import ReferralRate, Campaign, Task, Lead, Referral
        pt = db.session.get(PlatformType, pt_id)
        if not pt:
            raise ValueError("not found")
        in_use = db.session.query(ReferralRate).filter(ReferralRate.platform_id == pt_id).first()
        if in_use:
            raise ValueError("cannot delete: platform is in use by referral rates")
        pt.is_active = False
        db.session.commit()
        return dict(deleted=True)

    @staticmethod
    def generate_webhook_secret(db, pt_id):
        from app.models import PlatformType
        from app.utils.serializers import to_dict
        pt = db.session.get(PlatformType, pt_id)
        if not pt:
            raise ValueError("platform not found")
        secret, secret_hash, secret_prefix = _generate_secret()
        pt.webhook_secret = secret
        pt.webhook_secret_hash = secret_hash
        pt.webhook_secret_prefix = secret_prefix
        db.session.commit()
        result = to_dict(pt)
        result["webhook_secret"] = secret
        return result

    @staticmethod
    def set_webhook_url(db, pt_id, webhook_url):
        from app.models import PlatformType
        from app.utils.serializers import to_dict
        pt = db.session.get(PlatformType, pt_id)
        if not pt:
            raise ValueError("platform not found")
        if not webhook_url.startswith("https://") and not webhook_url.startswith("http://"):
            raise ValueError("webhook_url must be a valid HTTP(S) URL")
        pt.webhook_url = webhook_url
        db.session.commit()
        return to_dict(pt)

    @staticmethod
    def get_webhook_secret_for_platform(db, platform_id):
        from app.models import PlatformType
        pt = db.session.query(PlatformType).get(platform_id)
        return pt.webhook_secret_hash if pt else None