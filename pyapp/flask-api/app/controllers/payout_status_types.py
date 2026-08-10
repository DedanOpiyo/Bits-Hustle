import uuid
from app.extensions import db


class PayoutStatusTypeController:
    @staticmethod
    def list_payout_status_types(db):
        from app.models import PayoutStatusType
        from app.utils.serializers import to_dict
        payout_status_types = db.session.query(PayoutStatusType).all()
        return [to_dict(pst) for pst in payout_status_types]

    @staticmethod
    def get_payout_status_type(db, pst_id):
        from app.models import PayoutStatusType
        from app.utils.serializers import to_dict
        pst = db.session.get(PayoutStatusType, pst_id)
        if not pst:
            raise ValueError("not found")
        return to_dict(pst)

    @staticmethod
    def create_payout_status_type(db, payload: dict):
        from app.models import PayoutStatusType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        pst = PayoutStatusType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(pst)
        db.session.commit()
        return to_dict(pst)

    @staticmethod
    def update_payout_status_type(db, pst_id, payload: dict):
        from app.models import PayoutStatusType
        from app.utils.serializers import to_dict
        pst = db.session.get(PayoutStatusType, pst_id)
        if not pst:
            raise ValueError("not found")
        for field in ("name", "display_name", "description", "sortOrder", "isActive"):
            if field in payload:
                setattr(pst, field.lower().replace("Name", "_name").replace("Order", "_order"), payload[field])
        db.session.commit()
        return to_dict(pst)

    @staticmethod
    def delete_payout_status_type(db, pst_id):
        from app.models import PayoutStatusType
        pst = db.session.get(PayoutStatusType, pst_id)
        if not pst:
            raise ValueError("not found")
        db.session.delete(pst)
        db.session.commit()
        return dict(deleted=True)
