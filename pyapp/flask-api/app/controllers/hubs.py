import uuid
from app.extensions import db
from sqlalchemy.orm import joinedload


class HubController:
    @staticmethod
    def list_hubs(db, page=1, per_page=20, search=""):
        from app.models import Hub
        from app.utils.serializers import to_dict
        q = db.session.query(Hub).options(
            joinedload(Hub.ambassadors),
            joinedload(Hub.manager)
        )
        if search:
            q = q.filter(Hub.name.ilike(f"%{search}%"))
        paginated = q.order_by(Hub.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(h, with_relations=True) for h in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def create_hub(db, payload: dict):
        from app.models import Hub
        from app.utils.serializers import to_dict
        required = ("name", "location", "managerId")
        if not all(k in payload for k in required):
            raise ValueError("name, location, managerId required")
        hub = Hub(
            name=payload["name"],
            location=payload["location"],
            qr_code=payload.get("qrCode"),
            manager_id=payload["managerId"],
        )
        db.session.add(hub)
        db.session.commit()
        return to_dict(hub)

    @staticmethod
    def update_hub(db, hub_id, payload: dict):
        from app.models import Hub
        from app.utils.serializers import to_dict
        hub = db.session.get(Hub, hub_id)
        if not hub:
            raise ValueError("not found")
        for field in ("name", "location", "qrCode", "managerId"):
            if field in payload:
                setattr(hub, field.replace("qrCode", "qr_code").replace("managerId", "manager_id"), payload[field])
        db.session.commit()
        return to_dict(hub)

    @staticmethod
    def delete_hub(db, hub_id):
        from app.models import Hub
        hub = db.session.get(Hub, hub_id)
        if not hub:
            raise ValueError("not found")
        db.session.delete(hub)
        db.session.commit()
        return dict(deleted=True)

