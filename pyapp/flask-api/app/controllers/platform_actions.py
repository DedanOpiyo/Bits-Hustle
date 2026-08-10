"""Platform actions controller — self-service action registration for external platforms."""
from app.extensions import db


class PlatformActionController:
    @staticmethod
    def list_actions(db, platform_id=None, include_pending=False):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        query = db.session.query(ActionType).filter(ActionType.is_active == True)
        if platform_id:
            query = query.filter(ActionType.platform_id == platform_id)
        if not include_pending:
            query = query.filter(ActionType.is_approved == True)
        actions = query.order_by(ActionType.sort_order).all()
        return [to_dict(a) for a in actions]

    @staticmethod
    def register_action(db, platform_id, payload: dict, key_id=None):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        # Check for duplicate
        existing = db.session.query(ActionType).filter(
            ActionType.name == payload["name"]
        ).first()
        if existing:
            raise ValueError(f"action '{payload['name']}' already exists")
        # Actions from platform API keys start as pending approval
        is_approved = key_id is None  # Admin-created actions are auto-approved
        action = ActionType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            platform_id=platform_id,
            sort_order=payload.get("sortOrder", 0),
            is_approved=is_approved,
            is_active=is_approved,
            created_by_key_id=key_id,
        )
        db.session.add(action)
        db.session.commit()
        return to_dict(action)

    @staticmethod
    def approve_action(db, action_id):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        at = db.session.get(ActionType, action_id)
        if not at:
            raise ValueError("not found")
        if at.is_approved:
            raise ValueError("already approved")
        at.is_approved = True
        at.is_active = True
        db.session.commit()
        return to_dict(at)

    @staticmethod
    def list_pending(db):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        pending = db.session.query(ActionType).filter(
            ActionType.is_approved == False
        ).order_by(ActionType.created_at).all()
        return [to_dict(a) for a in pending]

