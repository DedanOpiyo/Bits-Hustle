from app.extensions import db

class ActivityFeedController:
    @staticmethod
    def get_activity_feed(db, ambassador_id=None, hub_id=None):
        from app.models import AuditLog
        from app.utils.serializers import to_dict
        q = db.session.query(AuditLog)
        if ambassador_id:
            q = q.filter(AuditLog.user_id == ambassador_id)
        if hub_id:
            q = q.filter(AuditLog.entity_type == "HUB")
        items = q.order_by(AuditLog.created_at.desc()).limit(100).all()
        return [to_dict(i) for i in items]

    @staticmethod
    def get_by_user(db, user_id):
        from app.models import AuditLog
        from app.utils.serializers import to_dict
        items = db.session.query(AuditLog)\
            .filter(AuditLog.user_id == user_id)\
            .order_by(AuditLog.created_at.desc())\
            .limit(50).all()
        return [to_dict(i) for i in items]

