"""Check-ins service — extracted from CheckInController."""

from app.extensions import db
from sqlalchemy.orm import joinedload


class CheckInService:
    @staticmethod
    def create(db, payload: dict, ambassador_id=None, override=False):
        from app.models import Ambassador, CheckIn
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone
        from sqlalchemy import and_
        required = ("hubId",)
        if not all(k in payload for k in required):
            raise ValueError("hubId required")
        amb = db.session.get(Ambassador, ambassador_id)
        if not amb:
            raise ValueError("ambassador not found")
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today.replace(hour=23, minute=59, second=59, microsecond=999999)
        existing = (
            db.session.query(CheckIn)
            .filter(
                and_(
                    CheckIn.ambassador_id == amb.id,
                    CheckIn.hub_id == payload["hubId"],
                    CheckIn.check_in_time >= today,
                    CheckIn.check_in_time <= tomorrow,
                )
            )
            .first()
        )
        if existing:
            if not override:
                raise ValueError("already checked in today")
            existing.check_out_time = None
            existing.check_in_time = datetime.utcnow()
            db.session.commit()
            return to_dict(existing)
        ci = CheckIn(
            ambassador_id=str(amb.id),
            hub_id=payload["hubId"],
            check_in_time=datetime.utcnow(),
        )
        db.session.add(ci)
        db.session.commit()
        return to_dict(ci)

    @staticmethod
    def scan(db, hub_id=None, payload=None, ambassador_id=None, override=False):
        from app.models import Ambassador, CheckIn, Hub
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone
        from sqlalchemy import and_
        qr_hub_id = hub_id or (payload.get("qrData") if payload else None)
        if not qr_hub_id:
            raise ValueError("hub id required in qrData or hub_id param")
        hub = db.session.get(Hub, qr_hub_id)
        if not hub:
            raise ValueError("hub not found")
        ci_payload = {"hubId": qr_hub_id}
        result = CheckInService.create(db, ci_payload, ambassador_id=ambassador_id, override=override)
        # ── SMS / WhatsApp notification on check-in scan ──
        try:
            from app.services.notification_channel_service import NotificationChannelService
            from app.controllers.notifications import NotificationController
            amb_record = db.session.get(Ambassador, ambassador_id) if ambassador_id else None
            amb_user = amb_record.user if amb_record and amb_record.user else None
            phone = amb_user.phone_number if amb_user else None
            title = f"Checked in at {hub.name}"
            message = f"You have successfully checked in at {hub.name}."
            NotificationController.create(
                db,
                user_id=amb_user.id if amb_user else None,
                title=title,
                message=message,
                reference_type="CHECK_IN",
                reference_id=result.get("id"),
            )
            notif_record = {"title": title, "message": message}
            NotificationChannelService.dispatch(notif_record, user_phone=phone, user_whatsapp=phone)
        except Exception:
            pass  # channel delivery must not break check-in flow
        return result

    @staticmethod
    def list(db, ambassador_id):
        from app.models import CheckIn, Ambassador
        from app.utils.serializers import to_dict
        items = db.session.query(CheckIn).options(
            joinedload(CheckIn.ambassador).joinedload(Ambassador.user),
            joinedload(CheckIn.hub)
        ).filter_by(ambassador_id=str(ambassador_id)).order_by(CheckIn.created_at.desc()).all()
        return [to_dict(c, with_relations=True) for c in items]

    @staticmethod
    def check_out(db, checkin_id, user_id=None):
        from app.models import CheckIn, Ambassador
        from app.utils.serializers import to_dict
        from datetime import datetime
        ci = db.session.get(CheckIn, checkin_id)
        if not ci:
            raise ValueError("not found")
        if user_id:
            amb = db.session.query(Ambassador).filter_by(user_id=user_id).first()
            if amb and str(amb.id) != str(ci.ambassador_id):
                raise ValueError("forbidden")
        ci.check_out_time = datetime.utcnow()
        db.session.commit()
        return to_dict(ci)

    @staticmethod
    def get_hub_attendance(db, hub_id, date=None):
        from app.models import CheckIn, Ambassador, Hub
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone, timedelta
        from sqlalchemy.orm import joinedload
        from sqlalchemy import and_
        hub = db.session.get(Hub, hub_id)
        if not hub:
            raise ValueError("hub not found")
        if date:
            target_date = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
        else:
            target_date = datetime.now(timezone.utc)
        day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        items = db.session.query(CheckIn).options(
            joinedload(CheckIn.ambassador).joinedload(Ambassador.user),
            joinedload(CheckIn.hub)
        ).filter(
            and_(
                CheckIn.hub_id == hub_id,
                CheckIn.check_in_time >= day_start,
                CheckIn.check_in_time < day_end,
            )
        ).order_by(CheckIn.check_in_time.desc()).all()
        result = [to_dict(c, with_relations=True) for c in items]
        unique_ambassadors = set(ci.ambassador_id for ci in items)
        active_sessions = [to_dict(c, with_relations=True) for c in items if c.check_out_time is None]
        completed_sessions = [to_dict(c, with_relations=True) for c in items if c.check_out_time is not None]
        total_duration_minutes = 0
        for c in completed_sessions:
            ci_obj = db.session.get(CheckIn, c["id"])
            if ci_obj and ci_obj.check_out_time:
                duration = (ci_obj.check_out_time - ci_obj.check_in_time).total_seconds() / 60
                total_duration_minutes += duration
        avg_duration = total_duration_minutes / len(completed_sessions) if completed_sessions else 0
        return {
            "items": result,
            "uniqueAmbassadors": len(unique_ambassadors),
            "activeSessions": len(active_sessions),
            "completedSessions": len(completed_sessions),
            "avgSessionDurationMinutes": round(avg_duration, 1),
            "hubName": hub.name,
        }

    @staticmethod
    def get_hub_attendance_trends(db, hub_id, days=7):
        from app.models import CheckIn, Hub
        from app.utils.serializers import to_dict
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import func, and_
        hub = db.session.get(Hub, hub_id)
        if not hub:
            raise ValueError("hub not found")
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = today - timedelta(days=days - 1)
        daily_stats = []
        for i in range(days):
            day = start_date + timedelta(days=i)
            day_end = day + timedelta(days=1)
            checkins_count = db.session.query(func.count(CheckIn.id)).filter(
                and_(
                    CheckIn.hub_id == hub_id,
                    CheckIn.check_in_time >= day,
                    CheckIn.check_in_time < day_end,
                )
            ).scalar() or 0
            unique_ambassadors = db.session.query(func.count(func.distinct(CheckIn.ambassador_id))).filter(
                and_(
                    CheckIn.hub_id == hub_id,
                    CheckIn.check_in_time >= day,
                    CheckIn.check_in_time < day_end,
                )
            ).scalar() or 0
            daily_stats.append({
                "date": day.strftime("%Y-%m-%d"),
                "checkins": int(checkins_count),
                "uniqueAmbassadors": int(unique_ambassadors),
            })
        return daily_stats

