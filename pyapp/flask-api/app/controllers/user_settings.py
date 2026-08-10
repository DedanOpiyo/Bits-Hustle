import uuid
from app.extensions import db


class UserSettingController:
    @staticmethod
    def list_user_settings(db, page=1, per_page=20, search="", user_id=None):
        from app.models import UserSetting
        from app.utils.serializers import to_dict
        q = db.session.query(UserSetting).options(
            joinedload(UserSetting.user)
        )
        if user_id:
            q = q.filter(UserSetting.user_id == str(user_id))
        if search:
            q = q.filter(UserSetting.theme.ilike(f"%{search}%"))
        paginated = q.order_by(UserSetting.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        return dict(
            items=[to_dict(us) for us in paginated.items],
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )
