import uuid
from app.extensions import db


class RoleTypeController:
    @staticmethod
    def list_role_types(db):
        from app.models import RoleType
        from app.utils.serializers import to_dict
        role_types = db.session.query(RoleType).all()
        return [to_dict(rt) for rt in role_types]

    @staticmethod
    def get_role_type(db, rt_id):
        from app.models import RoleType
        from app.utils.serializers import to_dict
        rt = db.session.get(RoleType, rt_id)
        if not rt:
            raise ValueError("not found")
        return to_dict(rt)

    @staticmethod
    def create_role_type(db, payload: dict):
        from app.models import RoleType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        rt = RoleType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(rt)
        db.session.commit()
        return to_dict(rt)

    @staticmethod
    def update_role_type(db, rt_id, payload: dict):
        from app.models import RoleType
        from app.utils.serializers import to_dict
        rt = db.session.get(RoleType, rt_id)
        if not rt:
            raise ValueError("not found")
        for field in ("name", "display_name", "description", "sortOrder", "isActive"):
            if field in payload:
                setattr(rt, field.lower().replace("Name", "_name").replace("Order", "_order"), payload[field])
        db.session.commit()
        return to_dict(rt)

    @staticmethod
    def delete_role_type(db, rt_id):
        from app.models import RoleType
        rt = db.session.get(RoleType, rt_id)
        if not rt:
            raise ValueError("not found")
        db.session.delete(rt)
        db.session.commit()
        return dict(deleted=True)
