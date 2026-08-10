import uuid
import random
import string
from app.extensions import db


class SupportTicketController:
    @staticmethod
    def _gen_ticket_num(db):
        return "TKT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

    @staticmethod
    def create_ticket(db, payload: dict, ambassador_id=None):
        from app.models import SupportTicket, Ambassador
        from app.utils.serializers import to_dict
        from app.services.email_service import EmailService
        required = ("subject", "description", "category")
        if not all(k in payload for k in required):
            raise ValueError("subject, description, category required")
        amb = None
        if ambassador_id:
            amb = db.session.query(Ambassador).filter_by(user_id=ambassador_id).first()
        if not amb:
            raise ValueError("ambassador not found")
        ticket_number = SupportTicketController._gen_ticket_num(db)
        t = SupportTicket(
            ticket_number=ticket_number,
            ambassador_id=str(amb.id),
            category=payload["category"],
            subject=payload["subject"],
            description=payload["description"],
            priority=payload.get("priority", "MEDIUM"),
        )
        db.session.add(t)
        db.session.commit()
        if amb.user and amb.user.email:
            EmailService.send_ticket_created(
                ambassador_email=amb.user.email,
                ambassador_name=amb.user.name or "Ambassador",
                ticket_number=ticket_number,
                subject=payload["subject"],
            )
        return to_dict(t)

    @staticmethod
    def list_support_tickets(db, assigned_to_id=None, page=1, per_page=20, search=""):
        from app.models import SupportTicket
        from app.utils.serializers import to_dict
        q = db.session.query(SupportTicket)
        if assigned_to_id:
            q = q.filter(SupportTicket.assigned_to_id == str(assigned_to_id))
        if search:
            q = q.filter(SupportTicket.subject.ilike(f"%{search}%"))
        paginated = q.order_by(SupportTicket.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(t) for t in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def list_my_tickets(db, ambassador_id):
        from app.models import SupportTicket, Ambassador
        from app.utils.serializers import to_dict
        amb = db.session.query(Ambassador).filter_by(user_id=ambassador_id).first()
        if not amb:
            return []
        items = db.session.query(SupportTicket).filter_by(ambassador_id=str(amb.id)).order_by(SupportTicket.created_at.desc()).all()
        return [to_dict(t) for t in items]

    @staticmethod
    def update_support_ticket(db, tid, payload: dict):
        from app.models import SupportTicket
        from app.utils.serializers import to_dict
        from app.services.email_service import EmailService
        t = db.session.get(SupportTicket, tid)
        if not t:
            raise ValueError("not found")
        status_changed = t.status != payload.get("status") and payload.get("status") in ("RESOLVED", "CLOSED")
        for field in ("status", "priority", "assignedToId", "resolution"):
            if field in payload:
                if field == "assignedToId":
                    setattr(t, "assigned_to_id", payload[field])
                else:
                    setattr(t, field.replace("assignedToId", "assigned_to_id"), payload[field])
        if payload.get("status") in ("RESOLVED", "CLOSED"):
            from datetime import datetime
            t.updated_at = datetime.utcnow()
        db.session.commit()
        if status_changed and t.ambassador and t.ambassador.user and t.ambassador.user.email:
            EmailService.send_ticket_resolved(
                ambassador_email=t.ambassador.user.email,
                ambassador_name=t.ambassador.user.name or "Ambassador",
                ticket_number=t.ticket_number,
                subject=t.subject,
                resolution=payload.get("resolution", "Your ticket has been resolved."),
            )
        return to_dict(t)

    @staticmethod
    def escalate_ticket(db, tid, payload: dict):
        """Escalate a ticket to the next level."""
        from app.models import SupportTicket, User, RoleType
        from app.utils.serializers import to_dict
        from datetime import datetime
        t = db.session.get(SupportTicket, tid)
        if not t:
            raise ValueError("not found")
        current_level = t.escalation_level if hasattr(t, "escalation_level") else 0
        new_level = current_level + 1
        if new_level > 2:
            raise ValueError("ticket already at maximum escalation level")
        target_role = "HUB_MANAGER" if new_level == 1 else "SUPER_ADMIN"
        role = db.session.query(RoleType).filter_by(name=target_role).first()
        if role:
            admin = db.session.query(User).filter_by(role_id=role.id).first()
            if admin:
                t.assigned_to_id = str(admin.id)
        if hasattr(t, "escalation_level"):
            t.escalation_level = new_level
        if hasattr(t, "escalated_at"):
            t.escalated_at = datetime.utcnow()
        t.updated_at = datetime.utcnow()
        db.session.commit()
        return to_dict(t)

    @staticmethod
    def check_escalations(db):
        """Check all open tickets for SLA breaches and auto-escalate."""
        from app.models import SupportTicket
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        open_tickets = db.session.query(SupportTicket).filter(
            SupportTicket.status.in_(["OPEN", "IN_PROGRESS"])
        ).all()
        escalated = []
        for t in open_tickets:
            current_level = t.escalation_level if hasattr(t, "escalation_level") else 0
            sla_hours = 48 if current_level == 0 else 24
            sla_deadline = t.created_at + timedelta(hours=sla_hours)
            if now > sla_deadline:
                try:
                    SupportTicketController.escalate_ticket(db, str(t.id), {})
                    escalated.append(str(t.id))
                except ValueError:
                    pass
        return escalated

