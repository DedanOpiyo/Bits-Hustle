from app.extensions import db


class BadgeService:
    @staticmethod
    def award_if_criteria_met(ambassador_id, badge_name):
        from app.models import Ambassador, Badge, AmbassadorBadge, Lead, TaskSubmission, Referral
        from datetime import datetime, timezone

        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            return None

        badge = db.session.query(Badge).filter_by(name=badge_name).first()
        if not badge:
            return None

        existing = db.session.query(AmbassadorBadge).filter_by(
            ambassador_id=str(amb.id), badge_id=str(badge.id)
        ).first()
        if existing:
            return existing

        criteria = badge.criteria or {}
        metric = criteria.get("metric", "")
        threshold = criteria.get("threshold", 0)

        count = 0
        if metric == "leads":
            count = db.session.query(Lead).filter_by(ambassador_id=str(amb.id)).count()
        elif metric == "task_submissions":
            count = db.session.query(TaskSubmission).filter_by(ambassador_id=str(amb.id)).count()
        elif metric == "converted_leads":
            count = db.session.query(Lead).filter_by(ambassador_id=str(amb.id)).filter(Lead.status_id != None).count()
        elif metric == "referrals":
            count = db.session.query(Referral).filter_by(ambassador_id=str(amb.id)).count()

        if count < threshold:
            return None

        ab = AmbassadorBadge(
            ambassador_id=str(amb.id),
            badge_id=str(badge.id),
            earned_at=datetime.now(timezone.utc),
        )
        db.session.add(ab)
        db.session.commit()
        return ab
