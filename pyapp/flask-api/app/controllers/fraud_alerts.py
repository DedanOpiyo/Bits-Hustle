import uuid
from app.extensions import db
from sqlalchemy.orm import joinedload


class FraudAlertController:
    @staticmethod
    def list_fraud_alerts(db, page=1, per_page=20, search=""):
        from app.models import FraudAlert
        from app.utils.serializers import to_dict
        q = db.session.query(FraudAlert)
        if search:
            q = q.filter(FraudAlert.message.ilike(f"%{search}%"))
        paginated = q.order_by(FraudAlert.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(f) for f in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def list_fraud_alerts_for_templates(db, page=1, per_page=20, search=""):
        from app.models import FraudAlert, Ambassador, User
        q = db.session.query(FraudAlert).options(
            joinedload(FraudAlert.ambassador).joinedload(Ambassador.user),
            joinedload(FraudAlert.resolved_by)
        )
        if search:
            q = q.filter(FraudAlert.message.ilike(f"%{search}%"))
        paginated = q.order_by(FraudAlert.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        from app.utils.serializers import to_dict
        return dict(
            items=[to_dict(f, with_relations=True) for f in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def resolve_fraud_alert(db, fid, resolved_by_id=None):
        from app.models import FraudAlert
        from app.utils.serializers import to_dict
        from datetime import datetime
        a = db.session.get(FraudAlert, fid)
        if not a:
            raise ValueError("not found")
        a.is_resolved = True
        if resolved_by_id:
            a.resolved_by_id = resolved_by_id
        a.resolved_at = datetime.utcnow()
        db.session.commit()
        return to_dict(a)

