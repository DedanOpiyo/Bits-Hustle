from app.extensions import db


class TierTypeController:
    @staticmethod
    def list_tier_types(db):
        from app.models import TierType
        from app.utils.serializers import to_dict
        tier_types = db.session.query(TierType).order_by(TierType.sort_order).all()
        return [to_dict(tt) for tt in tier_types]

    @staticmethod
    def get_tier_type(db, tt_id):
        from app.models import TierType
        from app.utils.serializers import to_dict
        tt = db.session.get(TierType, tt_id)
        if not tt:
            raise ValueError("not found")
        return to_dict(tt)

    @staticmethod
    def create_tier_type(db, payload: dict):
        from app.models import TierType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        tt = TierType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(tt)
        db.session.commit()
        return to_dict(tt)

    @staticmethod
    def update_tier_type(db, tt_id, payload: dict):
        from app.models import TierType
        from app.utils.serializers import to_dict
        tt = db.session.get(TierType, tt_id)
        if not tt:
            raise ValueError("not found")
        camel_to_snake = {"name": "name", "display_name": "display_name", "description": "description", "sortOrder": "sort_order", "isActive": "is_active"}
        for field, col in camel_to_snake.items():
            if field in payload:
                setattr(tt, col, payload[field])
        db.session.commit()
        return to_dict(tt)

    @staticmethod
    def delete_tier_type(db, tt_id):
        from app.models import TierType
        from app.models import ReferralRate
        existing = db.session.query(ReferralRate).filter(ReferralRate.tier == db.session.query(TierType).filter(TierType.id == tt_id).with_only_columns(TierType.name).scalar_subquery()).first()
        if existing:
            raise ValueError("cannot delete: tier is in use by referral rates")
        tt = db.session.get(TierType, tt_id)
        if not tt:
            raise ValueError("not found")
        tt.is_active = False
        db.session.commit()
        return dict(deleted=True)

