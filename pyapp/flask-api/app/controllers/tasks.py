import uuid
from app.extensions import db


class TaskController:
    @staticmethod
    def list_tasks(db, page=1, per_page=20, search=""):
        from app.models import Task
        from app.utils.serializers import to_dict
        from sqlalchemy.orm import joinedload
        q = db.session.query(Task).options(
            joinedload(Task.platform),
            joinedload(Task.campaign),
        )
        if search:
            q = q.filter(Task.description.ilike(f"%{search}%"))
        paginated = q.order_by(Task.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(t, with_relations=True) for t in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create_task(db, payload: dict):
        from app.services.task_service import TaskService
        from app.utils.serializers import to_dict
        try:
            t = TaskService.create(db, payload)
            return to_dict(t)
        except ValueError as e:
            raise ValueError(str(e))

    @staticmethod
    def update_task(db, tid, payload: dict):
        from app.services.task_service import TaskService
        from app.utils.serializers import to_dict
        try:
            t = TaskService.update(db, tid, payload)
            return to_dict(t)
        except ValueError as e:
            raise ValueError(str(e))

    @staticmethod
    def get_task(db, tid):
        from app.services.task_service import TaskService
        return TaskService.get_task(db, tid)

    @staticmethod
    def delete_task(db, tid):
        from app.models import Task
        t = db.session.get(Task, tid)
        if not t:
            raise ValueError("not found")
        db.session.delete(t)
        db.session.commit()
        return dict(deleted=True)

