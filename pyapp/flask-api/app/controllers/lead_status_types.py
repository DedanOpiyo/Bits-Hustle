import uuid
from app.extensions import db


class LeadStatusTypeController:
    @staticmethod
    def list_lead_status_types(db):
        from app.models import LeadStatusType
        from app.utils.serializers import to_dict
        lead_status_types = db.session.query(LeadStatusType).all()
        return [to_dict(lst) for lst in lead_status_types]

    @staticmethod
    def get_lead_status_type(db, lst_id):
        from app.models import LeadStatusType
        from app.utils.serializers import to_dict
        lst = db.session.get(LeadStatusType, lst_id)
        if not lst:
            raise ValueError("not found")
        return to_dict(lst)

    @staticmethod
    def create_lead_status_type(db, payload: dict):
        from app.models import LeadStatusType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        lst = LeadStatusType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(lst)
        db.session.commit()
        return to_dict(lst)

    @staticmethod
    def update_lead_status_type(db, lst_id, payload: dict):
        from app.models import LeadStatusType
        from app.utils.serializers import to_dict
        lst = db.session.get(LeadStatusType, lst_id)
        if not lst:
            raise ValueError("not found")
        for field in ("name", "display_name", "description", "sortOrder", "isActive"):
            if field in payload:
                setattr(lst, field.lower().replace("Name", "_name").replace("Order", "_order"), payload[field])
        db.session.commit()
        return to_dict(lst)

    @staticmethod
    def delete_lead_status_type(db, lst_id):
        from app.models import LeadStatusType
        lst = db.session.get(LeadStatusType, lst_id)
        if not lst:
            raise ValueError("not found")
        db.session.delete(lst)
        db.session.commit()
        return dict(deleted=True)
