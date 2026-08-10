import uuid
from app.extensions import db
from sqlalchemy.orm import joinedload


class LeadController:
    @staticmethod
    def list_leads(db, ambassador_id=None, page=1, per_page=20, search=""):
        from app.models import Lead, Ambassador, User
        from app.utils.serializers import to_dict
        q = db.session.query(Lead).options(
            joinedload(Lead.submitted_by_ambassador).joinedload(Ambassador.user),
            joinedload(Lead.campaign),
            joinedload(Lead.status),
            joinedload(Lead.platform)
        )
        if ambassador_id:
            user = db.session.get(User, ambassador_id)
            if user and user.role and user.role.name == "AMBASSADOR":
                amb = db.session.query(Ambassador).filter_by(user_id=ambassador_id).first()
                if amb:
                    q = q.filter(Lead.ambassador_id == str(amb.id))
            else:
                q = q.filter(Lead.ambassador_id == str(ambassador_id))
        if search:
            q = q.filter(Lead.contact_info.ilike(f"%{search}%"))
        paginated = q.order_by(Lead.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(l, with_relations=True) for l in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create_lead(db, payload: dict, ambassador_id=None):
        from app.utils.serializers import to_dict
        from app.services.lead_service import LeadService
        from app.models import Ambassador, User
        lead = LeadService.create(db, payload, ambassador_id=ambassador_id)
        # ── notification: lead submitted ──
        from app.controllers.notifications import NotificationController
        from app.models import PlatformType
        amb = None
        if ambassador_id:
            user = db.session.get(User, ambassador_id)
            if user and user.role and user.role.name == "AMBASSADOR":
                amb = db.session.query(Ambassador).filter_by(user_id=ambassador_id).first()
            else:
                amb = db.session.get(Ambassador, ambassador_id)
        amb_user = amb.user if amb and amb.user else None
        if amb_user:
            platform = db.session.get(PlatformType, lead.platform_id) if lead.platform_id else None
            platform_name = platform.display_name if platform else "Unknown Platform"
            NotificationController.create(
                db,
                user_id=amb_user.id,
                title="Lead Submitted",
                message=f"Lead '{payload['contactInfo'].get('name', 'Unknown')}' for {platform_name} has been submitted successfully.",
                reference_type="LEAD",
                reference_id=lead.id,
                platform_id=lead.platform_id,
            )
        return to_dict(lead)

    @staticmethod
    def update_lead_status(db, lead_id, status_id, ambassador_id=None):
        from app.services.lead_service import LeadService
        return LeadService.update_status(db, lead_id, status_id)

