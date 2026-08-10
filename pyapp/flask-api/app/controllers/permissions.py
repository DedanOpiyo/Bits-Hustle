import uuid
from app.extensions import db


class PermissionController:
    @staticmethod
    def list_permissions(db):
        from app.models import Permission
        from app.utils.serializers import to_dict
        permissions = db.session.query(Permission).all()
        return [to_dict(p) for p in permissions]

    @staticmethod
    def get_permission(db, p_id):
        from app.models import Permission
        from app.utils.serializers import to_dict
        p = db.session.get(Permission, p_id)
        if not p:
            raise ValueError("not found")
        return to_dict(p)

    @staticmethod
    def create_permission(db, payload: dict):
        from app.models import Permission
        from app.utils.serializers import to_dict
        required = ("name", "description", "resource", "action")
        if not all(k in payload for k in required):
            raise ValueError("name, description, resource, action required")
        permission = Permission(
            name=payload["name"],
            description=payload["description"],
            resource=payload["resource"],
            action=payload["action"],
        )
        db.session.add(permission)
        db.session.commit()
        return to_dict(permission)

    @staticmethod
    def update_permission(db, p_id, payload: dict):
        from app.models import Permission
        from app.utils.serializers import to_dict
        permission = db.session.get(Permission, p_id)
        if not permission:
            raise ValueError("not found")
        for field in ("name", "description", "resource", "action"):
            if field in payload:
                setattr(permission, field, payload[field])
        db.session.commit()
        return to_dict(permission)

    @staticmethod
    def delete_permission(db, p_id):
        from app.models import Permission
        permission = db.session.get(Permission, p_id)
        if not permission:
            raise ValueError("not found")
        db.session.delete(permission)
        db.session.commit()
        return dict(deleted=True)
