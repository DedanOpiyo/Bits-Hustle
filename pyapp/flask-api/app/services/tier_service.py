from app.extensions import db
from datetime import datetime, timezone


class AmbassadorTierService:
    TIER_CRITERIA = {
        "JUNIOR": {"min_tasks": 0},
        "AMBASSADOR": {"min_tasks": 20},
        "SENIOR": {"min_tasks": 50, "min_leads": 30},
        "CAMPUS_LEAD": {"min_tasks": 50, "min_leads": 30, "top_performer_months": 2},
    }

    @staticmethod
    def evaluate(db, ambassador_id):
        from app.models import Ambassador, TaskSubmission, Lead, Wallet
        from sqlalchemy import desc

        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            return None

        task_count = (
            db.session.query(TaskSubmission)
            .filter_by(ambassador_id=str(amb.id))
            .count()
        )
        lead_count = (
            db.session.query(Lead)
            .filter_by(ambassador_id=str(amb.id))
            .count()
        )

        new_tier = "JUNIOR"
        if task_count >= 50 and lead_count >= 30:
            new_tier = "CAMPUS_LEAD"
        elif task_count >= 50:
            new_tier = "SENIOR"
        elif task_count >= 20:
            new_tier = "AMBASSADOR"

        if new_tier != amb.tier:
            amb.tier = new_tier
            amb.last_active_at = datetime.now(timezone.utc)
            db.session.commit()
        return new_tier

