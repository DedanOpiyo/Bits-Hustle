import uuid
from app.extensions import db


class AppealController:
    @staticmethod
    def list_appeals(db, page=1, per_page=20, search=""):
        from app.models import Appeal
        from app.utils.serializers import to_dict
        q = db.session.query(Appeal)
        if search:
            q = q.filter(Appeal.reason.ilike(f"%{search}%"))
        paginated = q.order_by(Appeal.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(a) for a in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def my_appeals(db, user_id):
        from app.models import Appeal, Ambassador, PayoutRequest, PayoutStatusType, PlatformType
        from app.utils.serializers import to_dict
        from sqlalchemy.orm import joinedload
        emb = db.session.query(Ambassador).filter_by(user_id=user_id).first()
        if not emb:
            return []
        items = db.session.query(Appeal).options(
            joinedload(Appeal.payout_request).joinedload(PayoutRequest.status),
            joinedload(Appeal.payout_request).joinedload(PayoutRequest.platform),
            joinedload(Appeal.payout_request).joinedload(PayoutRequest.ambassador).joinedload(Ambassador.user),
        ).filter_by(ambassador_id=str(emb.id)).all()
        return [to_dict(a, with_relations=True) for a in items]

    @staticmethod
    def create_appeal(db, payload: dict, ambassador_id=None):
        from app.models import Appeal, Ambassador
        from app.utils.serializers import to_dict
        required = ("taskSubmissionId", "reason")
        if not all(k in payload for k in required):
            raise ValueError("taskSubmissionId, reason required")
        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("ambassador not found")
        a = Appeal(
            ambassador_id=str(amb.id),
            task_submission_id=payload["taskSubmissionId"],
            reason=payload["reason"],
        )
        db.session.add(a)
        db.session.commit()
        return to_dict(a)

    @staticmethod
    def review_appeal(db, appeal_id, payload: dict, reviewed_by_id=None):
        from app.models import Appeal, PayoutRequest, PayoutStatusType, Transaction
        from app.utils.serializers import to_dict
        from datetime import datetime
        from decimal import Decimal
        a = db.session.get(Appeal, appeal_id)
        if not a:
            raise ValueError("not found")
        a.status = payload.get("status", a.status)
        a.resolution = payload.get("resolution")
        if reviewed_by_id:
            a.reviewed_by_id = reviewed_by_id
        a.reviewed_at = datetime.utcnow()

        if a.status == "APPROVED" and a.payout_request_id:
            pr = db.session.get(PayoutRequest, a.payout_request_id)
            if pr:
                pending_status = db.session.query(PayoutStatusType).filter_by(name="PENDING").first()
                if pending_status:
                    pr.status_id = pending_status.id
                amb_user = pr.ambassador.user if pr.ambassador and pr.ambassador.user else None
                if amb_user:
                    try:
                        from app.controllers.notifications import NotificationController
                        platform_name = ""
                        if pr.platform_id:
                            from app.models import PlatformType
                            platform = db.session.get(PlatformType, pr.platform_id)
                            platform_name = f" on {platform.display_name}" if platform else ""
                        NotificationController.create(
                            db,
                            user_id=amb_user.id,
                            title="Payout Appeal Approved",
                            message=f"Your appeal for payout of KES {pr.amount}{platform_name} has been approved. The payout is now under review.",
                            reference_type="PAYOUT_REQUEST",
                            reference_id=pr.id,
                        )
                    except Exception:
                        pass

        db.session.commit()
        return to_dict(a)
