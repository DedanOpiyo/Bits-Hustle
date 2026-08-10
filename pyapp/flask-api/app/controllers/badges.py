import uuid
from app.extensions import db


class BadgeController:
    @staticmethod
    def list_badges(db, page=1, per_page=20, search=""):
        from app.models import Badge
        from app.utils.serializers import to_dict
        q = db.session.query(Badge)
        if search:
            q = q.filter(Badge.name.ilike(f"%{search}%"))
        paginated = q.order_by(Badge.sort_order).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(b) for b in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def my_badges(db, user_id):
        from app.models import AmbassadorBadge, Ambassador
        from app.utils.serializers import to_dict
        amb = db.session.query(Ambassador).filter_by(user_id=user_id).first()
        if not amb:
            return []
        items = db.session.query(AmbassadorBadge).filter_by(ambassador_id=str(amb.id)).all()
        return [to_dict(b) for b in items]

    @staticmethod
    def create_badge(db, payload: dict):
        from app.models import Badge
        from app.utils.serializers import to_dict
        required = ("name", "description", "icon", "criteria")
        if not all(k in payload for k in required):
            raise ValueError("name, description, icon, criteria required")
        b = Badge(
            name=payload["name"],
            description=payload["description"],
            icon=payload["icon"],
            criteria=payload["criteria"],
            tier=payload.get("tier", "BRONZE"),
        )
        db.session.add(b)
        db.session.commit()
        return to_dict(b)

    @staticmethod
    def get_badge(db, badge_id):
        from app.models import Badge
        from app.utils.serializers import to_dict
        b = db.session.get(Badge, badge_id)
        if not b:
            raise ValueError("not found")
        return to_dict(b)

    @staticmethod
    def check_and_award(db, ambassador_id):
        from app.services.badge_service import BadgeService
        from app.controllers.notifications import NotificationController
        from app.models import Ambassador, Badge
        
        badges = db.session.query(Badge).all()
        results = []
        for b in badges:
            ab = BadgeService.award_if_criteria_met(ambassador_id, b.name)
            if ab:
                results.append(ab)
                # ── notification: badge earned ──
                amb = db.session.get(Ambassador, ambassador_id)
                amb_user = amb.user if amb and amb.user else None
                if amb_user:
                    NotificationController.create(
                        db,
                        user_id=amb_user.id,
                        title="Badge Earned!",
                        message=f"You've earned the '{b.name}' badge.",
                        reference_type="BADGE",
                        reference_id=b.id,
                    )
        return results
