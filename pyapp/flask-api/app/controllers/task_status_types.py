import uuid
from app.extensions import db


class TaskStatusTypeController:
    @staticmethod
    def list_task_status_types(db):
        from app.models import TaskStatusType
        from app.utils.serializers import to_dict
        task_status_types = db.session.query(TaskStatusType).all()
        return [to_dict(tst) for tst in task_status_types]

    @staticmethod
    def get_task_status_type(db, tst_id):
        from app.models import TaskStatusType
        from app.utils.serializers import to_dict
        tst = db.session.get(TaskStatusType, tst_id)
        if not tst:
            raise ValueError("not found")
        return to_dict(tst)

    @staticmethod
    def create_task_status_type(db, payload: dict):
        from app.models import TaskStatusType
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        tst = TaskStatusType(
            name=payload["name"],
            display_name=payload["display_name"],
            description=payload.get("description"),
            sort_order=payload.get("sortOrder", 0),
            is_active=payload.get("isActive", True),
        )
        db.session.add(tst)
        db.session.commit()
        return to_dict(tst)

    @staticmethod
    def update_task_status_type(db, tst_id, payload: dict):
        from app.models import TaskStatusType
        from app.utils.serializers import to_dict
        tst = db.session.get(TaskStatusType, tst_id)
        if not tst:
            raise ValueError("not found")
        for field in ("name", "display_name", "description", "sortOrder", "isActive"):
            if field in payload:
                setattr(tst, field.lower().replace("Name", "_name").replace("Order", "_order"), payload[field])
        db.session.commit()
        return to_dict(tst)

    @staticmethod
    def delete_task_status_type(db, tst_id):
        from app.models import TaskStatusType
        tst = db.session.get(TaskStatusType, tst_id)
        if not tst:
            raise ValueError("not found")
        db.session.delete(tst)
        db.session.commit()
        return dict(deleted=True)
