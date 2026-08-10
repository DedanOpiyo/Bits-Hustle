import uuid
from app.extensions import db


class TaskTypeTypeController:
    @staticmethod
    def list_task_type_types(db):
        from app.models import TaskTypeType
        from app.utils.serializers import to_dict
        task_type_types = db.session.query(TaskTypeType).all()
        return [to_dict(ttt) for ttt in task_type_types]

    @staticmethod
    def get_task_type_type(db, ttt_id):
        from app.models import TaskTypeType
        from app.utils.serializers import to_dict
        ttt = db.session.get(TaskTypeType, ttt_id)
        if not ttt:
            raise ValueError("not found")
        return to_dict(ttt)

    @staticmethod
    def create_task_type_type(db, payload: dict):
        from app.models import TaskTypeType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        ttt = TaskTypeType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(ttt)
        db.session.commit()
        return to_dict(ttt)

    @staticmethod
    def update_task_type_type(db, ttt_id, payload: dict):
        from app.models import TaskTypeType
        from app.utils.serializers import to_dict
        ttt = db.session.get(TaskTypeType, ttt_id)
        if not ttt:
            raise ValueError("not found")
        for field in ("name", "display_name", "description", "sortOrder", "isActive"):
            if field in payload:
                setattr(ttt, field.lower().replace("Name", "_name").replace("Order", "_order"), payload[field])
        db.session.commit()
        return to_dict(ttt)

    @staticmethod
    def delete_task_type_type(db, ttt_id):
        from app.models import TaskTypeType
        ttt = db.session.get(TaskTypeType, ttt_id)
        if not ttt:
            raise ValueError("not found")
        db.session.delete(ttt)
        db.session.commit()
        return dict(deleted=True)
