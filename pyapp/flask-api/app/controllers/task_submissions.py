from datetime import datetime

from app.extensions import db
from app.services.role_permission_service import RolePermissionService
from app.models import User
from sqlalchemy.orm import joinedload


class TaskSubmissionController:
    @staticmethod
    def can_review(user: User, task_submission) -> bool:
        """Check if user can review a task submission."""
        return RolePermissionService.can_review_task(user, task_submission)

    @staticmethod
    def list_submissions(db, page=1, per_page=20, search="", ambassador_id=None):
        from app.models import TaskSubmission, Ambassador, Task
        from app.utils.serializers import to_dict

        q = db.session.query(TaskSubmission).options(
            joinedload(TaskSubmission.ambassador).joinedload(Ambassador.user),
            joinedload(TaskSubmission.task).joinedload(Task.campaign),
            joinedload(TaskSubmission.status),
        )
        if ambassador_id:
            q = q.filter(TaskSubmission.ambassador_id == str(ambassador_id))
        if search:
            q = q.filter(TaskSubmission.proof_url.ilike(f"%{search}%"))
        paginated = q.order_by(TaskSubmission.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(s, with_relations=True) for s in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create_submission(db, payload: dict, ambassador_id=None):
        from app.models import TaskSubmission, Ambassador, Task
        from app.utils.serializers import to_dict
        from app.services.task_service import TaskService

        required = ("taskId", "proofUrl")
        if not all(k in payload for k in required):
            raise ValueError("taskId, proofUrl required")
        if not payload.get("proofUrl") or not str(payload["proofUrl"]).strip():
            raise ValueError("proofUrl is required and cannot be empty")

        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("ambassador not found")

        task = db.session.get(Task, payload["taskId"])
        if task and task.deadline and datetime.utcnow() > task.deadline:
            raise ValueError("submission deadline has passed")

        submission = TaskService.submit_proof(
            db,
            {
                "taskId": payload["taskId"],
                "proofUrl": payload["proofUrl"],
            },
            ambassador_id=ambassador_id,
        )
        return submission if isinstance(submission, dict) else to_dict(submission)

    @staticmethod
    def update_submission(db, sid, payload: dict):
        from app.models import TaskSubmission, Ambassador, User, RoleType, TaskStatusType
        from app.utils.serializers import to_dict

        s = db.session.get(TaskSubmission, sid)
        if not s:
            raise ValueError("not found")

        status_id = payload.get("statusId")
        status_name = payload.get("statusName")
        resolved_status = None
        if status_id:
            resolved_status = db.session.get(TaskStatusType, status_id)
        elif status_name:
            resolved_status = db.session.query(TaskStatusType).filter_by(name=str(status_name).upper()).first()
            if not resolved_status:
                raise ValueError(f"Unknown status: {status_name}")

        if resolved_status and resolved_status.name in ("APPROVED", "REJECTED"):
            return TaskSubmissionController.review_submission(db, sid, payload)

        reviewed_by_id = payload.get("reviewedById")
        if reviewed_by_id:
            rev_user = db.session.get(User, reviewed_by_id)
            if rev_user and rev_user.role:
                amb_role = db.session.query(RoleType).filter(RoleType.name == "AMBASSADOR").first()
                is_amb = amb_role and str(rev_user.role_id) == str(amb_role.id)
                if is_amb:
                    ambassador = db.session.get(Ambassador, s.ambassador_id)
                    if ambassador and ambassador.user_id == rev_user.id:
                        db.session.rollback()
                        raise ValueError("ambassadors cannot approve their own tasks")

        if status_id:
            s.status_id = status_id
        elif resolved_status:
            s.status_id = resolved_status.id
        if "reviewedById" in payload:
            s.reviewed_by_id = payload["reviewedById"]
        if s.reviewed_by_id and not s.reviewed_at:
            s.reviewed_at = datetime.utcnow()
        if "proofUrl" in payload and payload["proofUrl"]:
            s.proof_url = payload["proofUrl"]
        db.session.commit()
        return to_dict(s)

    @staticmethod
    def review_submission(db, sid, payload: dict):
        from app.models import TaskSubmission, TaskStatusType
        from app.utils.serializers import to_dict
        from app.services.task_service import TaskService

        s = db.session.get(TaskSubmission, sid)
        if not s:
            raise ValueError("not found")

        reviewed_by_id = payload.get("reviewedById")
        status_id = payload.get("statusId")
        status_name = payload.get("statusName")
        reason = payload.get("rejectionReason") or payload.get("rejection_reason")

        resolved_status = None
        if status_id:
            resolved_status = db.session.get(TaskStatusType, status_id)
        elif status_name:
            resolved_status = db.session.query(TaskStatusType).filter_by(name=str(status_name).upper()).first()
        else:
            raise ValueError("statusId or statusName required")

        if not resolved_status:
            raise ValueError("task status not found")

        if resolved_status.name == "APPROVED":
            result = TaskService.approve_submission(db, sid, reviewed_by_id=reviewed_by_id)
        elif resolved_status.name == "REJECTED":
            if not reason or not str(reason).strip():
                raise ValueError("rejection reason is required")
            result = TaskService.reject_submission(db, sid, reason, reviewed_by_id=reviewed_by_id)
        else:
            s.status_id = resolved_status.id
            if reviewed_by_id:
                s.reviewed_by_id = reviewed_by_id
            if s.reviewed_by_id and not s.reviewed_at:
                s.reviewed_at = datetime.utcnow()
            db.session.commit()
            result = to_dict(s)

        return result if isinstance(result, dict) else to_dict(result)

