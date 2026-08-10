from app.extensions import db


class ActionTypeController:
    @staticmethod
    def list_action_types(db):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        action_types = db.session.query(ActionType).order_by(ActionType.sort_order).all()
        return [to_dict(at) for at in action_types]

    @staticmethod
    def get_action_type(db, at_id):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        at = db.session.get(ActionType, at_id)
        if not at:
            raise ValueError("not found")
        return to_dict(at)

    @staticmethod
    def create_action_type(db, payload: dict):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        at = ActionType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(at)
        db.session.commit()
        return to_dict(at)

    @staticmethod
    def update_action_type(db, at_id, payload: dict):
        from app.models import ActionType
        from app.utils.serializers import to_dict
        at = db.session.get(ActionType, at_id)
        if not at:
            raise ValueError("not found")
        camel_to_snake = {"name": "name", "display_name": "display_name", "description": "description", "sortOrder": "sort_order", "isActive": "is_active"}
        for field, col in camel_to_snake.items():
            if field in payload:
                setattr(at, col, payload[field])
        db.session.commit()
        return to_dict(at)

    @staticmethod
    def delete_action_type(db, at_id):
        from app.models import ActionType
        from app.models import ReferralRate
        at = db.session.get(ActionType, at_id)
        if not at:
            raise ValueError("not found")
        in_use = db.session.query(ReferralRate).filter(ReferralRate.action == at.name).first()
        if in_use:
            raise ValueError("cannot delete: action is in use by referral rates")
        at.is_active = False
        db.session.commit()
        return dict(deleted=True)

