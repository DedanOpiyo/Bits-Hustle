import uuid
from app.extensions import db
from sqlalchemy.orm import joinedload


class AuditLogController:
    @staticmethod
    def list_audit_logs(db, page=1, per_page=20, search=""):
        from app.models import AuditLog
        from app.utils.serializers import to_dict
        q = db.session.query(AuditLog)
        if search:
            q = q.filter(AuditLog.action.ilike(f"%{search}%"))
        paginated = q.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(l) for l in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def list_audit_logs_for_templates(db, page=1, per_page=20, search=""):
        from app.models import AuditLog
        from app.utils.serializers import to_dict
        q = db.session.query(AuditLog).options(
            joinedload(AuditLog.user)
        )
        if search:
            q = q.filter(AuditLog.action.ilike(f"%{search}%"))
        paginated = q.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(l, with_relations=True) for l in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

