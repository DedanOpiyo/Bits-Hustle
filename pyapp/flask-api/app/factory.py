import pathlib
import time
import uuid
from datetime import datetime
from flask import Flask
from app.extensions import db, migrate, bcrypt, jwt, cors
from app.config import get_config
from app.routes import register_all_blueprints


def datetimeformat(value, format='%Y-%m-%d %H:%M'):
    """Format datetime for templates."""
    if isinstance(value, str):
        return value
    return value.strftime(format) if value else ''


def gen_uuid():
    return str(uuid.uuid4())


def _retry_db_call(func, max_retries=None, retry_delay=1.0):
    """Retry a database call with backoff, absorbing connection errors."""
    from sqlalchemy.exc import OperationalError
    retries = max_retries if max_retries is not None else 3
    attempts = retries
    while attempts > 0:
        try:
            return func()
        except OperationalError as e:
            attempts -= 1
            err_msg = str(e).lower()
            if 'too many connections' in err_msg and attempts > 0:
                print("[seed] DB connection limit reached, retrying in {}s...".format(retry_delay))
                time.sleep(retry_delay)
                continue
            print("[seed] DB error (no retry): {}".format(e))
            return None
    return None


def _ensure_roles(app):
    """Auto-seed role types if the table is empty."""
    with app.app_context():
        from app.models import RoleType
        from sqlalchemy import inspect

        def _inspect_and_seed():
            if not inspect(db.engine).has_table("role_types"):
                return
            existing = RoleType.query.first()
            if existing:
                return
            print("[seed] RoleType table empty - seeding default roles...")
            role_data = [
                ("SUPER_ADMIN", "Super Admin", "Full system access"),
                ("HUB_MANAGER", "Hub Manager", "Manages a hub and its ambassadors"),
                ("AMBASSADOR", "Ambassador", "Earns rewards via campaigns"),
                ("FINANCE_OFFICER", "Finance Officer", "Manages payouts & finance"),
                ("SUPPORT_OFFICER", "Support Officer", "Handles support tickets"),
                ("PARTNER_ADVERTISER", "Partner Advertiser", "Creates and manages campaigns"),
                ("CLIENT", "Client", "Submits assignments/gigs"),
                ("ADMIN", "Administrator", "Manages the gig assignment system"),
                ("GIG_WORKER", "Gig Worker", "Completes assigned work"),
                ("REFERRED_USER", "Referred User", "User captured through ambassador referral tracking"),
            ]
            for name, display, desc in role_data:
                db.session.add(RoleType(name=name, display_name=display, description=desc))
            db.session.commit()
            print("[seed] {} roles seeded successfully.".format(len(role_data)))

        _retry_db_call(_inspect_and_seed, app.config.get("DB_CONNECTION_MAX_RETRIES", 3))


def create_app(config_override=None) -> Flask:
    app = Flask(__name__)

# --- config ---
    cfg = config_override or get_config()
    if isinstance(cfg, type):
        app.config.from_object(cfg)
    else:
        app.config.update(cfg)

    # --- extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Build CORS origins: frontend + all partner platform origins
    cors_origins = [
        app.config.get("FRONTEND_URL", "*"),
        "https://bitshustlehubs.co.ke",
        "https://api.bitshustlehubs.co.ke",
    ]
    partner_origins = app.config.get("PARTNER_ORIGINS", "")
    if partner_origins:
        cors_origins.extend(o.strip() for o in partner_origins.split(","))

    cors.init_app(app, resources={r"/api/*": {
        "origins": cors_origins,
        "supports_credentials": True,
        "allow_headers": ["Content-Type", "Authorization", "X-API-Key", "X-Webhook-Signature"],
    }})

    # --- blueprints ---
    register_all_blueprints(app)

    # --- auto-seed roles if missing ---
    _ensure_roles(app)

    @app.route("/health")
    def health():
        return {"status": "ok"}, 200

    @app.route("/api")
    def api_root():
        return {"message": "BitsHustle Flask API", "version": "1.0.0"}, 200

    return app
