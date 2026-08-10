from app.extensions import db


class AssignmentCategoryController:
    @staticmethod
    def list_categories(db):
        from app.models import AssignmentCategory
        from app.utils.serializers import to_dict
        categories = db.session.query(AssignmentCategory).order_by(AssignmentCategory.sort_order, AssignmentCategory.display_name).all()
        return [to_dict(c) for c in categories]

    @staticmethod
    def create_category(db, payload: dict):
        from app.models import AssignmentCategory
        from app.utils.serializers import to_dict
        required = ("name", "display_name")
        if not all(k in payload for k in required):
            raise ValueError("name, display_name required")
        category = AssignmentCategory(
            name=payload["name"].strip(),
            display_name=payload["display_name"].strip(),
            description=payload.get("description"),
            sort_order=payload.get("sort_order", 0),
            is_active=payload.get("is_active", True),
        )
        db.session.add(category)
        db.session.commit()
        return to_dict(category)

    @staticmethod
    def update_category(db, category_id, payload: dict):
        from app.models import AssignmentCategory
        from app.utils.serializers import to_dict
        category = db.session.get(AssignmentCategory, category_id)
        if not category:
            raise ValueError("not found")
        for field in ("name", "display_name", "description", "sort_order", "is_active"):
            if field in payload:
                setattr(category, field, payload[field])
        db.session.commit()
        return to_dict(category)

    @staticmethod
    def delete_category(db, category_id):
        from app.models import AssignmentCategory
        category = db.session.get(AssignmentCategory, category_id)
        if not category:
            raise ValueError("not found")
        db.session.delete(category)
        db.session.commit()
        return dict(deleted=True)
