from app.extensions import db


class AnnouncementService:
    @staticmethod
    def list(db, page=1, per_page=20, search="", announcement_type=None, hub_id=None):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        q = db.session.query(Announcement).filter_by(is_active=True)
        if search:
            q = q.filter(Announcement.title.ilike(f"%{search}%"))
        if announcement_type:
            q = q.filter(Announcement.type == announcement_type)
        if hub_id:
            q = q.filter(Announcement.hub_id == hub_id)
        # Also include announcements without hub_id (system-wide) when no hub_id specified
        if not hub_id:
            q = q.filter((Announcement.hub_id.is_(None)) | (Announcement.hub_id == ""))
        paginated = q.order_by(Announcement.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(r, with_relations=True) for r in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create(db, payload: dict):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        required = ("title", "content")
        if not all(k in payload for k in required):
            raise ValueError("title, content required")
        a = Announcement()
        a.title = payload["title"]
        a.content = payload["content"]
        a.type = payload.get("type", "SYSTEM")
        a.hub_id = payload.get("hubId")
        a.author_id = payload.get("authorId")  # Should be set from authenticated user in controller
        a.priority = payload.get("priority", "NORMAL")
        a.expires_at = payload.get("expiresAt")
        a.is_active = payload.get("isActive", True)
        db.session.add(a)
        db.session.commit()
        return to_dict(a)

    @staticmethod
    def update(db, aid, payload: dict):
        from app.models import Announcement
        from app.utils.serializers import to_dict
        a = db.session.get(Announcement, aid)
        if not a:
            raise ValueError("not found")
        for field in ("title", "content", "type", "hubId", "authorId", "priority", "expiresAt", "isActive"):
            if field in payload:
                # Convert camelCase to snake_case for model attributes
                attr_name = "".join(["_" + c.lower() if c.isupper() else c for c in field]).lstrip("_")
                setattr(a, attr_name, payload[field])
        db.session.commit()
        return to_dict(a)

    @staticmethod
    def delete(db, aid):
        from app.models import Announcement
        a = db.session.get(Announcement, aid)
        if not a:
            raise ValueError("not found")
        a.is_active = False  # Soft delete
        db.session.commit()
        return {"message": "Announcement deactivated"}
