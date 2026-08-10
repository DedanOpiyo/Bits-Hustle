import uuid
from app.extensions import db


class NotificationController:
    @staticmethod
    def get_notifications(db, user_id=None, page=1, per_page=20):
        from app.models import Notification
        from app.utils.serializers import to_dict
        q = db.session.query(Notification)
        if user_id:
            q = q.filter(Notification.user_id == str(user_id))
        paginated = q.order_by(Notification.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(n) for n in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def mark_notification_read(db, nid, user_id):
        from app.models import Notification
        from app.utils.serializers import to_dict
        n = db.session.get(Notification, nid)
        if not n:
            raise ValueError("not found")
        if str(n.user_id) != str(user_id):
            raise ValueError("forbidden")
        n.is_read = True
        from datetime import datetime
        n.read_at = datetime.utcnow()
        db.session.commit()
        return to_dict(n)

    @staticmethod
    def delete_notification(db, nid, user_id):
        from app.models import Notification
        n = db.session.get(Notification, nid)
        if not n:
            raise ValueError("not found")
        if str(n.user_id) != str(user_id):
            raise ValueError("forbidden")
        db.session.delete(n)
        db.session.commit()
        return dict(deleted=True)

    @staticmethod
    def create(db, user_id, title, message, reference_type=None, reference_id=None, platform_id=None):
        from app.models import Notification, User, UserSetting
        from app.utils.serializers import to_dict
        # Initialize data as empty dict if None, then add platform_id if provided
        data = {}
        if platform_id is not None:
            data['platform_id'] = platform_id
        n = Notification(
            user_id=user_id,
            title=title,
            message=message,
            reference_type=reference_type,
            reference_id=reference_id,
            data=data,
        )
        db.session.add(n)
        db.session.commit()
        user = db.session.get(User, user_id)
        if not user:
            return to_dict(n)
        # ── attempt email delivery ──
        try:
            if user.email:
                from app.services.email_service import EmailService
                EmailService.send(
                    to=user.email,
                    subject=f"[Bits Hustle Hub] {title}",
                    body_html=f"<html><body><h2>{title}</h2><p>{message}</p></body></html>",
                    body_text=message,
                )
        except Exception:
            pass  # email failure must not break notification creation
        # ── attempt SMS / WhatsApp delivery ──
        try:
            setting = db.session.query(UserSetting).filter_by(user_id=user_id).first()
            phone = user.phone_number
            if phone:
                from app.services.notification_channel_service import NotificationChannelService
                dispatch_phone = phone if setting and getattr(setting, "sms_notifications", False) else None
                dispatch_wa = phone if setting and getattr(setting, "whatsapp_notifications", False) else None
                notif_record = {"title": title, "message": message}
                NotificationChannelService.dispatch(
                    notif_record, user_phone=dispatch_phone, user_whatsapp=dispatch_wa,
                )
        except Exception:
            pass  # sms/whatsapp failure must not break notification creation
        return to_dict(n)
