from datetime import datetime, timedelta, timezone
from app.extensions import db


class InactivityService:
    @staticmethod
    def INACTIVITY_DAYS():
        from flask import current_app
        return current_app.config.get("INACTIVITY_DAYS", 30)

    @staticmethod
    def scan_and_flag(db, dry_run=False):
        from app.models import Ambassador, CheckIn, TaskSubmission

        cutoff = datetime.now(timezone.utc) - timedelta(days=InactivityService.INACTIVITY_DAYS())
        flagged = []

        ambassadors = db.session.query(Ambassador).all()
        for amb in ambassadors:
            if amb.status and amb.status.upper() in ("INACTIVE",):
                continue
            latest_checkin = (
                db.session.query(CheckIn)
                .filter(CheckIn.ambassador_id == amb.id)
                .order_by(CheckIn.check_in_time.desc())
                .first()
            )
            latest_submission = (
                db.session.query(TaskSubmission)
                .filter(TaskSubmission.ambassador_id == amb.id)
                .order_by(TaskSubmission.created_at.desc())
                .first()
            )
            dates = [
                latest_checkin.check_in_time if latest_checkin else None,
                latest_submission.created_at if latest_submission else None,
            ]
            last_active = max((d for d in dates if d is not None), default=None)
            if last_active and last_active < cutoff:
                if not dry_run:
                    amb.status = "INACTIVE"
                    amb.last_active_at = last_active
                flagged.append(
                    {
                        "ambassadorId": str(amb.id),
                        "hubId": str(amb.hub_id),
                        "lastActive": last_active.isoformat(),
                        "daysInactive": (datetime.now(timezone.utc) - last_active).days,
                    }
                )
        if not dry_run:
            db.session.commit()
        return {"flagged": flagged, "total": len(flagged)}

    @staticmethod
    def reactivate(db, ambassador_id):
        from app.models import Ambassador
        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("not found")
        amb.status = "ACTIVE"
        amb.last_active_at = datetime.now(timezone.utc)
        db.session.commit()
        return amb

