import uuid
from app.extensions import db


class RolePermissionController:
    @staticmethod
    def list_role_permissions(db):
        from app.models import RolePermission
        from app.utils.serializers import to_dict
        role_permissions = db.session.query(RolePermission).all()
        return [to_dict(rp) for rp in role_permissions]

    @staticmethod
    def get_role_permission(db, rp_id):
        from app.models import RolePermission
        from app.utils.serializers import to_dict
        rp = db.session.get(RolePermission, rp_id)
        if not rp:
            raise ValueError("not found")
        return to_dict(rp)

    @staticmethod
    def create_role_permission(db, payload: dict):
        from app.models import RolePermission
        from app.utils.serializers import to_dict
        required = ("roleId", "permissionId")
        if not all(k in payload for k in required):
            raise ValueError("roleId, permissionId required")
        rp = RolePermission(
            role_id=payload["roleId"],
            permission_id=payload["permissionId"],
        )
        db.session.add(rp)
        db.session.commit()
        return to_dict(rp)

    @staticmethod
    def update_role_permission(db, rp_id, payload: dict):
        from app.models import RolePermission
        from app.utils.serializers import to_dict
        rp = db.session.get(RolePermission, rp_id)
        if not rp:
            raise ValueError("not found")
        for field in ("roleId", "permissionId"):
            if field in payload:
                setattr(rp, field.lower().replace("Id", "_id"), payload[field])
        db.session.commit()
        return to_dict(rp)

    @staticmethod
    def delete_role_permission(db, rp_id):
        from app.models import RolePermission
        rp = db.session.get(RolePermission, rp_id)
        if not rp:
            raise ValueError("not found")
        db.session.delete(rp)
        db.session.commit()
        return dict(deleted=True)
