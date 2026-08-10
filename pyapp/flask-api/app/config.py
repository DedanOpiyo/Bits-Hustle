import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:"
        f"{urllib.parse.quote(os.getenv('DB_PASSWORD', ''), safe='')}"
        f"@{os.getenv('DB_HOST', 'localhost')}:"
        f"{os.getenv('DB_PORT', '3306')}/"
        f"{os.getenv('DB_NAME', 'bitshustle')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 2,
        "max_overflow": 1,
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "pool_timeout": 10,
        "pool_reset_on_return": "rollback",
    }
    DB_CONNECTION_MAX_RETRIES = int(os.getenv("DB_CONNECTION_MAX_RETRIES", "3"))
    DB_CONNECTION_RETRY_DELAY = float(os.getenv("DB_CONNECTION_RETRY_DELAY", "1.0"))
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400)
    )
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    REFERRAL_ATTRIBUTION_DAYS = int(
        os.getenv("REFERRAL_ATTRIBUTION_DAYS", "30")
    )
    MIN_PAYOUT_AMOUNT = float(
        os.getenv("MIN_PAYOUT_AMOUNT", "500")
    )
    # Inactivity policy: ambassadors with no check-in or task submission for N days are marked INACTIVE
    INACTIVITY_DAYS = int(
        os.getenv("INACTIVITY_DAYS", "30")
    )
    # Hub operating fee policy: percentage of ambassador task earnings deducted as hub operating fees.
    HUB_OPERATING_FEE_ENABLED = os.getenv("HUB_OPERATING_FEE_ENABLED", "true").lower() in ("1", "true", "yes")
    HUB_OPERATING_FEE_PERCENT = float(
        os.getenv("HUB_OPERATING_FEE_PERCENT", "10")
    )
    # Fraud penalty escalation matrix
    # Each strike triggers progressive penalties:
    # 1 strike: WARNING
    # 2 strikes: TEMPORARY_SUSPENSION (3 days)
    # 3 strikes: EXTENDED_SUSPENSION (7 days)
    # 4+ strikes: PERMANENT_BAN (with wallet clawback option)
    FRAUD_PENALTY_MATRIX = {
        "warning": {
            "min_strikes": 0,
            "max_strikes": 1,
            "action": "WARNING",
            "suspension_days": 0,
            "clawback_enabled": False,
            "description": "Monitoring account for suspicious activity"
        },
        "temporary_suspension": {
            "min_strikes": 2,
            "max_strikes": 2,
            "action": "TEMPORARY_SUSPENSION",
            "suspension_days": 3,
            "clawback_enabled": False,
            "description": "3-day account suspension for suspected fraud"
        },
        "extended_suspension": {
            "min_strikes": 3,
            "max_strikes": 3,
            "action": "EXTENDED_SUSPENSION",
            "suspension_days": 7,
            "clawback_enabled": False,
            "description": "7-day account suspension pending investigation"
        },
        "permanent_ban": {
            "min_strikes": 4,
            "max_strikes": float('inf'),
            "action": "PERMANENT_BAN",
            "suspension_days": 99999,
            "clawback_enabled": True,
            "description": "Permanent account ban; wallet clawback eligible"
        }
    }
    # Earning rewards — base amounts for each earning source
    LEAD_REWARD_AMOUNT = float(os.getenv("LEAD_REWARD_AMOUNT", "50"))
    REFERRAL_REWARD_AMOUNT = float(os.getenv("REFERRAL_REWARD_AMOUNT", "100"))
    LEAD_CONVERSION_REWARD_AMOUNT = float(os.getenv("LEAD_CONVERSION_REWARD_AMOUNT", "200"))
    # Webhook security configuration
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
    # CORS: comma-separated partner platform origins
    PARTNER_ORIGINS = os.getenv("PARTNER_ORIGINS", "")
    # Email / SMTP configuration
    SMTP_ENABLED = os.getenv("SMTP_ENABLED", "false").lower() in ("1", "true", "yes")
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASS = os.getenv("SMTP_PASS", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    # SMS configuration (Phase 2)
    SMS_ENABLED = os.getenv("SMS_ENABLED", "false").lower() in ("1", "true", "yes")
    SMS_PROVIDER = os.getenv("SMS_PROVIDER", "mobilesasa")  # mobilesasa or twilio
    MOBILESASA_API_KEY = os.getenv("MOBILESASA_API_KEY", "")
    MOBILESASA_API_SECRET = os.getenv("MOBILESASA_API_SECRET", "")
    MOBILESASA_SENDER_ID = os.getenv("MOBILESASA_SENDER_ID", "")
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
    # WhatsApp configuration (Phase 3)
    WHATSAPP_ENABLED = os.getenv("WHATSAPP_ENABLED", "false").lower() in ("1", "true", "yes")
    WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
    WHATSAPP_FROM_NUMBER = os.getenv("WHATSAPP_FROM_NUMBER", "")

# tasks.so background-task queue -------------------------------------------------
# TASK_SO_MODE controls behaviour at startup:
#   OFF     — queue is never started; sync endpoints are no-ops
#   SYNC    — tasks are executed synchronously inside the request handler
#   CONSUME — task worker is started alongside the app (needs Redis / broker)
_TASK_SO_MODES = {"OFF", "SYNC", "CONSUME"}


class TaskSoConfig:
    mode: str = os.getenv("TASK_SO_MODE", "OFF").upper()
    redis_url: str = os.getenv("TASK_SO_REDIS_URL", "redis://localhost:6379/0")
    default_queue: str = os.getenv("TASK_SO_DEFAULT_QUEUE", "default")

    def __init__(self):
        if self.mode not in _TASK_SO_MODES:
            raise ValueError(
                f"TASK_SO_MODE must be one of {_TASK_SO_MODES}, got '{self.mode}'"
            )

    @property
    def enabled(self) -> bool:
        return self.mode != "OFF"

    @property
    def consume(self) -> bool:
        return self.mode == "CONSUME"

    @property
    def sync(self) -> bool:
        return self.mode == "SYNC"


task_so_config = TaskSoConfig()
# --------------------------------------------------------------------------------


class DevConfig(Config):
    DEBUG = True


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = 3600


class ProdConfig(Config):
    DEBUG = False


config_map = {
    "development": DevConfig,
    "testing": TestConfig,
    "production": ProdConfig,
}


def get_config():
    env = os.getenv("FLASK_ENV", "development")
    return config_map.get(env, DevConfig)

