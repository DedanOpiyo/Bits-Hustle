import uuid
import string
import secrets
from app.extensions import db
from sqlalchemy.orm import joinedload


class UserController:
    @staticmethod
    def list_users(db, page=1, per_page=20, search=""):
        from app.models import User
        from app.utils.serializers import to_dict
        q = db.session.query(User).options(joinedload(User.role))
        if search:
            q = q.filter(db.or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
        paginated = q.paginate(page=page, per_page=per_page, error_out=False)
        items = []
        for u in paginated.items:
            d = to_dict(u)
            d["is_active"] = u.is_active
            if u.role:
                d["role"] = to_dict(u.role)
            items.append(d)
        return dict(
            items=items,
            total=paginated.total,
            page=page,
            pages=paginated.pages,
        )

    @staticmethod
    def get_user(db, user_id):
        from app.models import User
        from app.utils.serializers import to_dict
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("not found")
        d = to_dict(user)
        d["is_active"] = user.is_active
        if user.role:
            d["role"] = to_dict(user.role)
        return d

    @staticmethod
    def create_user(db, payload: dict):
        from app.models import User
        from app.utils.auth import hash_password
        from app.utils.serializers import to_dict
        print(f"[DEBUG] create_user called with payload: {payload}")
        
        required = ("email", "name", "roleId")
        missing = [k for k in required if k not in payload or not str(payload.get(k, "")).strip()]
        if missing:
            print(f"[DEBUG] Missing required fields: {missing}")
            raise ValueError(f"email, name, roleId required. Missing: {missing}")
            
        email_exists = db.session.query(User).filter_by(email=payload["email"]).first()
        if email_exists:
            print(f"[DEBUG] Email already exists: {payload['email']}")
            raise ValueError("email already exists")
        
        phone = payload.get("phoneNumber")
        if phone:
            phone_exists = db.session.query(User).filter_by(phone_number=phone).first()
            if phone_exists:
                print(f"[DEBUG] Phone number already exists: {phone}")
                raise ValueError("phone number already exists")
        
        temp_password = UserController._generate_password()
        
        print(f"[DEBUG] Creating user object with:")
        print(f"  email: {payload['email']}")
        print(f"  name: {payload['name']}")
        print(f"  role_id: {payload['roleId']}")
        print(f"  phone_number: {payload.get('phoneNumber')}")
        print(f"  is_user_active: {payload.get('isActive', False)}")
        print(f"  must_change_password: True")
        
        user = User(
            email=payload["email"],
            password=hash_password(temp_password),
            name=payload["name"],
            role_id=payload["roleId"],
            phone_number=payload.get("phoneNumber"),
            is_user_active=payload.get("isActive", False),
            must_change_password=True,
        )
        print(f"[DEBUG] Created user object: {user}")
        
        try:
            db.session.add(user)
            db.session.commit()
            print(f"[DEBUG] User committed successfully with ID: {user.id}")
            
            from app.services.email_service import EmailService
            try:
                EmailService.send_welcome_credentials(
                    user_email=payload["email"],
                    user_name=payload["name"],
                    temp_password=temp_password,
                )
                print(f"[DEBUG] Welcome email sent to {payload['email']}")
            except Exception as email_err:
                print(f"[WARN] Failed to send welcome email: {email_err}")
            
            result = to_dict(user)
            print(f"[DEBUG] Returning result: {result}")
            return result
        except Exception as e:
            db.session.rollback()
            print(f"[DEBUG] Error committing user: {str(e)}")
            raise e

    @staticmethod
    def _generate_password(length=12):
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%"),
        ]
        password += [secrets.choice(alphabet) for _ in range(length - 4)]
        secrets.SystemRandom().shuffle(password)
        return "".join(password)

    @staticmethod
    def update_user(db, user_id, payload: dict):
        from app.models import User
        from app.utils.auth import hash_password
        from app.utils.serializers import to_dict
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("not found")
        for field in ("name", "phoneNumber", "roleId", "avatarUrl", "password"):
            if field in payload:
                if field == "password":
                    setattr(user, "password", hash_password(payload["password"]))
                else:
                    attr = field.replace("phoneNumber", "phone_number").replace("avatarUrl", "avatar_url").replace("roleId", "role_id")
                    setattr(user, attr, payload[field])
        db.session.commit()
        return to_dict(user)

    @staticmethod
    def delete_user(db, user_id):
        from app.models import User
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("not found")
        db.session.delete(user)
        db.session.commit()
        return dict(deleted=True)

    @staticmethod
    def activate_user(db, user_id):
        from app.models import User
        from app.utils.serializers import to_dict
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("not found")
        user.is_user_active = True
        db.session.commit()
        d = to_dict(user)
        d["is_active"] = user.is_active
        return d

    @staticmethod
    def deactivate_user(db, user_id):
        from app.models import User
        from app.utils.serializers import to_dict
        user = db.session.get(User, user_id)
        if not user:
            raise ValueError("not found")
        user.is_user_active = False
        db.session.commit()
        d = to_dict(user)
        d["is_active"] = user.is_active
        return d
