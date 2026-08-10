import uuid
from datetime import datetime
from app.extensions import db
from sqlalchemy.orm import joinedload


class AnnouncementController:
    @staticmethod
    def create_announcement(db, payload: dict):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        required = ("title", "content")
        if not all(k in payload for k in required):
            raise ValueError("title, content required")
        a = Announcement(
            title=payload["title"],
            content=payload["content"],
            type=payload.get("type", "SYSTEM"),
            hub_id=payload.get("hubId"),
            author_id=payload.get("authorId"),
            priority=payload.get("priority", "NORMAL"),
            expires_at=payload.get("expiresAt"),
            is_active=payload.get("isActive", True),
        )
        db.session.add(a)
        db.session.commit()
        return to_dict(a, with_relations=True)

    @staticmethod
    def list_announcements(db, page=1, per_page=20, search="", announcement_type=None, hub_id=None):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        q = db.session.query(Announcement).filter_by(is_active=True)
        now = datetime.utcnow()
        q = q.filter((Announcement.expires_at.is_(None)) | (Announcement.expires_at > now))
        if search:
            q = q.filter(Announcement.title.ilike(f"%{search}%"))
        if announcement_type:
            q = q.filter(Announcement.type == announcement_type)
        if hub_id:
            q = q.filter(Announcement.hub_id == hub_id)
        if not hub_id:
            q = q.filter((Announcement.hub_id.is_(None)) | (Announcement.hub_id == ""))
        q = q.options(
            joinedload(Announcement.hub),
            joinedload(Announcement.author),
        )
        paginated = q.order_by(Announcement.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(a, with_relations=True) for a in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def get_announcement(db, aid):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        a = db.session.get(Announcement, aid)
        if not a:
            raise ValueError("not found")
        return to_dict(a, with_relations=True)

    @staticmethod
    def list_announcements_for_templates(db, page=1, per_page=20, search=""):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        q = db.session.query(Announcement).options(
            joinedload(Announcement.hub),
            joinedload(Announcement.author)
        ).filter_by(is_active=True)
        if search:
            q = q.filter(Announcement.title.ilike(f"%{search}%"))
        paginated = q.order_by(Announcement.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(a, with_relations=True) for a in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def update_announcement(db, aid, payload: dict):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        a = db.session.get(Announcement, aid)
        if not a:
            raise ValueError("not found")
        for field in ("title", "content", "type", "hubId", "priority", "expiresAt", "isActive"):
            if field in payload:
                attr_name = "".join(["_" + c.lower() if c.isupper() else c for c in field]).lstrip("_")
                setattr(a, attr_name, payload[field])
        db.session.commit()
        return to_dict(a, with_relations=True)

    @staticmethod
    def delete_announcement(db, aid):
        from app.models import Announcement
        a = db.session.get(Announcement, aid)
        if not a:
            raise ValueError("not found")
        a.is_active = False
        db.session.commit()
        return {"message": "Deleted successfully"}