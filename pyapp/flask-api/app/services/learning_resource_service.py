from app.extensions import db


class LearningResourceService:
    @staticmethod
    def list(db, page=1, per_page=20, search="", category=None):
        from app.models import LearningResource
        from app.utils.serializers import to_dict
        q = db.session.query(LearningResource).filter_by(is_active=True)
        if search:
            q = q.filter(LearningResource.title.ilike(f"%{search}%"))
        if category:
            q = q.filter(LearningResource.category == category)
        paginated = q.order_by(LearningResource.sort_order).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(r, with_relations=True) for r in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create(db, payload: dict):
        from app.models import LearningResource
        from app.utils.serializers import to_dict
        required = ("title", "description", "category", "type", "url")
        if not all(k in payload for k in required):
            raise ValueError("title, description, category, type, url required")
        lr = LearningResource()
        lr.title = payload["title"]
        lr.description = payload["description"]
        lr.category = payload["category"]
        lr.type = payload["type"]
        lr.url = payload["url"]
        lr.thumbnail_url = payload.get("thumbnailUrl")
        lr.tags = payload.get("tags")
        lr.is_active = payload.get("isActive", True)
        lr.sort_order = payload.get("sortOrder", 0)
        db.session.add(lr)
        db.session.commit()
        return to_dict(lr)

    @staticmethod
    def update(db, rid, payload: dict):
        from app.models import LearningResource
        from app.utils.serializers import to_dict
        lr = db.session.get(LearningResource, rid)
        if not lr:
            raise ValueError("not found")
        for field in ("title", "description", "category", "type", "url", "thumbnailUrl", "tags", "isActive", "sortOrder"):
            if field in payload:
                # Convert camelCase to snake_case for model attributes
                attr_name = "".join(["_" + c.lower() if c.isupper() else c for c in field]).lstrip("_")
                setattr(lr, attr_name, payload[field])
        db.session.commit()
        return to_dict(lr)

    @staticmethod
    def delete(db, rid):
        from app.models import LearningResource
        lr = db.session.get(LearningResource, rid)
        if not lr:
            raise ValueError("not found")
        lr.is_active = False  # Soft delete
        db.session.commit()
        return {"message": "Learning resource deactivated"}
