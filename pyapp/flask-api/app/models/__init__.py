import uuid
from datetime import datetime
from app.extensions import db


def gen_uuid():
    return str(uuid.uuid4())


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  Dynamic Enum Tables
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class RoleType(db.Model):
    __tablename__ = "role_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship("User", back_populates="role")
    role_permissions = db.relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")


class PlatformType(db.Model):
    __tablename__ = "platform_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    referral_url_template = db.Column(db.String(512))
    webhook_secret = db.Column(db.String(255))
    webhook_secret_hash = db.Column(db.String(255))
    webhook_secret_prefix = db.Column(db.String(8))
    webhook_url = db.Column(db.String(512))
    logo_url = db.Column(db.String(512))
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaigns = db.relationship("Campaign", back_populates="platform")
    referrals = db.relationship("Referral", back_populates="platform", foreign_keys="Referral.platform_id")
    tasks = db.relationship("Task", back_populates="platform")
    leads = db.relationship("Lead", back_populates="platform")


class TierType(db.Model):
    __tablename__ = "tier_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    referral_rates = db.relationship("ReferralRate", primaryjoin="foreign(ReferralRate.tier) == TierType.name", viewonly=True)


class ActionType(db.Model):
    __tablename__ = "action_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=True)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    is_approved = db.Column(db.Boolean, default=True)
    created_by_key_id = db.Column(db.String(36), db.ForeignKey("platform_api_keys.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    platform = db.relationship("PlatformType")
    created_by_key = db.relationship("PlatformApiKey")
    referral_rates = db.relationship("ReferralRate", primaryjoin="foreign(ReferralRate.action) == ActionType.name", viewonly=True)


class PlatformApiKey(db.Model):
    __tablename__ = "platform_api_keys"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=False)
    name = db.Column(db.String(128), nullable=False)
    key_hash = db.Column(db.String(255), nullable=False)
    key_prefix = db.Column(db.String(8), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    scopes = db.Column(db.JSON, default=lambda: ["actions:create", "rates:create", "rates:update"])
    last_used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    platform = db.relationship("PlatformType")
    created_actions = db.relationship("ActionType", back_populates="created_by_key")


class TaskTypeType(db.Model):
    __tablename__ = "task_type_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tasks = db.relationship("Task", back_populates="type")


class TaskStatusType(db.Model):
    __tablename__ = "task_status_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task_submissions = db.relationship("TaskSubmission", back_populates="status")


class LeadStatusType(db.Model):
    __tablename__ = "lead_status_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    leads = db.relationship("Lead", back_populates="status")


class PayoutStatusType(db.Model):
    __tablename__ = "payout_status_types"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payout_requests = db.relationship("PayoutRequest", back_populates="status")


class Permission(db.Model):
    __tablename__ = "permissions"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(128), unique=True, nullable=False)
    description = db.Column(db.Text)
    resource = db.Column(db.String(128), nullable=False)
    action = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    role_permissions = db.relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(db.Model):
    __tablename__ = "role_permissions"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    role_id = db.Column(db.String(36), db.ForeignKey("role_types.id"), nullable=False)
    permission_id = db.Column(db.String(36), db.ForeignKey("permissions.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    role = db.relationship("RoleType", back_populates="role_permissions")
    permission = db.relationship("Permission", back_populates="role_permissions")

    __table_args__ = (db.UniqueConstraint("role_id", "permission_id"),)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
#  Core Entities
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(32), unique=True)
    role_id = db.Column(db.String(36), db.ForeignKey("role_types.id"), nullable=False)
    avatar_url = db.Column(db.String(512))
    is_user_active = db.Column(db.Boolean, default=False)
    must_change_password = db.Column(db.Boolean, default=False)
    password_reset_token = db.Column(db.String(255))
    password_reset_token_expires = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    role = db.relationship("RoleType", back_populates="users")
    profile = db.relationship("UserSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    hubs_managed = db.relationship("Hub", back_populates="manager", cascade="all, delete-orphan")
    campaigns = db.relationship("Campaign", back_populates="created_by", foreign_keys="Campaign.created_by_id")
    task_submissions_reviewed = db.relationship("TaskSubmission", back_populates="reviewed_by")
    payout_requests_reviewed = db.relationship("PayoutRequest", back_populates="reviewed_by")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    announcements = db.relationship("Announcement", back_populates="author")
    appeals = db.relationship("Appeal", back_populates="reviewed_by")
    audits = db.relationship("AuditLog", back_populates="user")
    fraud_alerts_resolved = db.relationship(
        "FraudAlert", back_populates="resolved_by", foreign_keys="FraudAlert.resolved_by_id"
    )

    @property
    def is_active(self):
        if not self.is_user_active:
            return False
        role = getattr(self, "role", None)
        return bool(role and getattr(role, "is_active", True))

    def to_dict(self):
        from app.utils.serializers import to_dict as _to_dict
        d = _to_dict(self)
        d["is_active"] = self.is_active
        return d


class Hub(db.Model):
    __tablename__ = "hubs"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(512), nullable=False)
    qr_code = db.Column(db.Text)
    manager_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    manager = db.relationship("User", back_populates="hubs_managed")
    ambassadors = db.relationship("Ambassador", back_populates="hub", cascade="all, delete-orphan")
    check_ins = db.relationship("CheckIn", back_populates="hub", cascade="all, delete-orphan")
    announcements = db.relationship("Announcement", back_populates="hub", cascade="all, delete-orphan")


class Ambassador(db.Model):
    __tablename__ = "ambassadors"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False)
    hub_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=False)
    referral_code = db.Column(db.String(64), unique=True, nullable=False)
    tier = db.Column(db.String(32), nullable=False, default="JUNIOR")
    status = db.Column(db.String(32), nullable=False, default="ACTIVE")
    last_active_at = db.Column(db.DateTime)
    fraud_strike_count = db.Column(db.Integer, default=0)
    suspension_reason = db.Column(db.String(128))
    suspended_until = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref="ambassador_profile")
    hub = db.relationship("Hub", back_populates="ambassadors")
    wallet = db.relationship("Wallet", back_populates="ambassador", uselist=False, cascade="all, delete-orphan")
    task_submissions = db.relationship("TaskSubmission", back_populates="ambassador", cascade="all, delete-orphan")
    leads = db.relationship("Lead", back_populates="ambassador", foreign_keys="Lead.ambassador_id", cascade="all, delete-orphan")
    submitted_leads = db.relationship("Lead", back_populates="submitted_by_ambassador", foreign_keys="Lead.submitted_by_ambassador_id", cascade="all, delete-orphan")
    referrals = db.relationship("Referral", back_populates="ambassador", cascade="all, delete-orphan")
    check_ins = db.relationship("CheckIn", back_populates="ambassador", cascade="all, delete-orphan")
    payout_requests = db.relationship("PayoutRequest", back_populates="ambassador", cascade="all, delete-orphan")
    badges = db.relationship("AmbassadorBadge", back_populates="ambassador", cascade="all, delete-orphan")
    appeals = db.relationship("Appeal", back_populates="ambassador", cascade="all, delete-orphan")
    support_tickets = db.relationship("SupportTicket", back_populates="ambassador", cascade="all, delete-orphan")
    fraud_alerts = db.relationship("FraudAlert", back_populates="ambassador", cascade="all, delete-orphan")


class Wallet(db.Model):
    __tablename__ = "wallets"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), unique=True, nullable=False)
    current_balance = db.Column(db.Float, default=0.0)
    pending_earnings = db.Column(db.Float, default=0.0)
    total_earned = db.Column(db.Float, default=0.0)
    total_withdrawn = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="wallet")
    transactions = db.relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan")


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    wallet_id = db.Column(db.String(36), db.ForeignKey("wallets.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(32), nullable=False)  # EARNING or WITHDRAWAL
    description = db.Column(db.Text, nullable=False)
    reference_id = db.Column(db.String(36), nullable=False)
    reference_type = db.Column(db.String(64))
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"))  # For platform attribution
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    wallet = db.relationship("Wallet", back_populates="transactions")
    platform = db.relationship("PlatformType")


class Campaign(db.Model):
    __tablename__ = "campaigns"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=False)
    created_by_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    budget = db.Column(db.Float, nullable=False)
    reward_structure = db.Column(db.JSON)
    approval_status = db.Column(db.String(32), nullable=False, default="PENDING")
    approved_by_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    approved_at = db.Column(db.DateTime)
    approval_notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    platform = db.relationship("PlatformType", back_populates="campaigns")
    created_by = db.relationship("User", back_populates="campaigns", foreign_keys=[created_by_id])
    approved_by = db.relationship("User", foreign_keys=[approved_by_id])
    tasks = db.relationship("Task", back_populates="campaign", cascade="all, delete-orphan")
    leads = db.relationship("Lead", back_populates="campaign", cascade="all, delete-orphan")


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    campaign_id = db.Column(db.String(36), db.ForeignKey("campaigns.id"), nullable=False)
    type_id = db.Column(db.String(36), db.ForeignKey("task_type_types.id"), nullable=False)
    description = db.Column(db.Text, nullable=False)
    reward = db.Column(db.Float, nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = db.relationship("Campaign", back_populates="tasks")
    type = db.relationship("TaskTypeType", back_populates="tasks")
    platform = db.relationship("PlatformType", back_populates="tasks")
    submissions = db.relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan")


class TaskSubmission(db.Model):
    __tablename__ = "task_submissions"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    task_id = db.Column(db.String(36), db.ForeignKey("tasks.id"), nullable=False)
    status_id = db.Column(db.String(36), db.ForeignKey("task_status_types.id"), nullable=False)
    proof_url = db.Column(db.Text)
    reviewed_by_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime)
    rejection_reason = db.Column(db.Text)  # For storing reason when rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="task_submissions")
    task = db.relationship("Task", back_populates="submissions")
    status = db.relationship("TaskStatusType", back_populates="task_submissions")
    reviewed_by = db.relationship("User", back_populates="task_submissions_reviewed")
    appeals = db.relationship("Appeal", back_populates="task_submission", cascade="all, delete-orphan")


class Lead(db.Model):
    __tablename__ = "leads"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    submitted_by_ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    campaign_id = db.Column(db.String(36), db.ForeignKey("campaigns.id"), nullable=False)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=False)
    contact_info = db.Column(db.JSON, nullable=False)  # {name, email, phone}
    status_id = db.Column(db.String(36), db.ForeignKey("lead_status_types.id"), nullable=False)
    converted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", foreign_keys=[ambassador_id])
    submitted_by_ambassador = db.relationship("Ambassador", foreign_keys=[submitted_by_ambassador_id])
    campaign = db.relationship("Campaign", back_populates="leads")
    platform = db.relationship("PlatformType", back_populates="leads")
    status = db.relationship("LeadStatusType", back_populates="leads")


class Referral(db.Model):
    __tablename__ = "referrals"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=False)
    referred_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    referral_code_used = db.Column(db.String(64))
    action = db.Column(db.String(64))
    conversion_status = db.Column(db.String(32), nullable=False, default="PENDING")
    referred_platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"))
    status = db.Column(db.String(32), nullable=False, default="PENDING")
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="referrals")
    platform = db.relationship("PlatformType", back_populates="referrals", foreign_keys=[platform_id])
    referred_platform = db.relationship("PlatformType", foreign_keys=[referred_platform_id])
    referred_user = db.relationship("User", backref="referred_from")


class CheckIn(db.Model):
    __tablename__ = "check_ins"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    hub_id = db.Column(db.String(36), db.ForeignKey("hubs.id"), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=False)
    check_out_time = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="check_ins")
    hub = db.relationship("Hub", back_populates="check_ins")


class Announcement(db.Model):
    __tablename__ = "announcements"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(32), nullable=False, default="SYSTEM")
    hub_id = db.Column(db.String(36), db.ForeignKey("hubs.id"))
    author_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    priority = db.Column(db.String(32), nullable=False, default="NORMAL")
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hub = db.relationship("Hub", back_populates="announcements")
    author = db.relationship("User", back_populates="announcements")


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(64), nullable=False, default='SYSTEM')
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.JSON)
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reference_type = db.Column(db.String(64))
    reference_id = db.Column(db.String(36))

    user = db.relationship("User", back_populates="notifications")


class SupportTicket(db.Model):
    __tablename__ = "support_tickets"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ticket_number = db.Column(db.String(64), unique=True, nullable=False)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    category = db.Column(db.String(64), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="OPEN")
    priority = db.Column(db.String(32), nullable=False, default="MEDIUM")
    assigned_to_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    resolution = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="support_tickets")
    assigned_to = db.relationship("User", backref="assigned_tickets")


class LearningResource(db.Model):
    __tablename__ = "learning_resources"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(64), nullable=False)
    type = db.Column(db.String(32), nullable=False)
    url = db.Column(db.String(512), nullable=False)
    thumbnail_url = db.Column(db.String(512))
    tags = db.Column(db.JSON)
    is_active = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Badge(db.Model):
    __tablename__ = "badges"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(128), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(255), nullable=False)
    criteria = db.Column(db.JSON, nullable=False)
    tier = db.Column(db.String(32), nullable=False, default="BRONZE")
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    ambassador_badges = db.relationship("AmbassadorBadge", back_populates="badge", cascade="all, delete-orphan")


class AmbassadorBadge(db.Model):
    __tablename__ = "ambassador_badges"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    badge_id = db.Column(db.String(36), db.ForeignKey("badges.id"), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="badges")
    badge = db.relationship("Badge", back_populates="ambassador_badges")

    __table_args__ = (db.UniqueConstraint("ambassador_id", "badge_id"),)


class Appeal(db.Model):
    __tablename__ = "appeals"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    task_submission_id = db.Column(db.String(36), db.ForeignKey("task_submissions.id"), nullable=True)
    payout_request_id = db.Column(db.String(36), db.ForeignKey("payout_requests.id"))  # Links appeal to a payout request
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="PENDING")
    resolution = db.Column(db.Text)
    reviewed_by_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="appeals")
    task_submission = db.relationship("TaskSubmission", back_populates="appeals")
    payout_request = db.relationship("PayoutRequest")
    reviewed_by = db.relationship("User", back_populates="appeals")


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    action = db.Column(db.String(64), nullable=False)
    entity_type = db.Column(db.String(64), nullable=False)
    entity_id = db.Column(db.String(36), nullable=False)
    changes = db.Column(db.JSON)
    ip_address = db.Column(db.String(64))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="audits")


class PayoutRequest(db.Model):
    __tablename__ = "payout_requests"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=True)  # Optional for legacy records
    amount = db.Column(db.Float, nullable=False)
    status_id = db.Column(db.String(36), db.ForeignKey("payout_status_types.id"), nullable=False)
    method = db.Column(db.String(64))
    details = db.Column(db.Text)
    admin_notes = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)  # For storing reason when rejected
    reviewed_by_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="payout_requests")
    platform = db.relationship("PlatformType")
    status = db.relationship("PayoutStatusType", back_populates="payout_requests")
    reviewed_by = db.relationship("User", back_populates="payout_requests_reviewed")


class UserSetting(db.Model):
    __tablename__ = "user_settings"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False)
    email_notifications = db.Column(db.Boolean, default=True)
    sms_notifications = db.Column(db.Boolean, default=False)
    whatsapp_notifications = db.Column(db.Boolean, default=False)
    theme = db.Column(db.String(16), nullable=False, default="LIGHT")
    language = db.Column(db.String(8), nullable=False, default="EN")
    timezone = db.Column(db.String(64), nullable=False, default="Africa/Nairobi")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="profile")


class FraudAlert(db.Model):
    __tablename__ = "fraud_alerts"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    ambassador_id = db.Column(db.String(36), db.ForeignKey("ambassadors.id"), nullable=False)
    type = db.Column(db.String(64), nullable=False)
    severity = db.Column(db.String(32), nullable=False)
    message = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON)
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    resolved_by_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ambassador = db.relationship("Ambassador", back_populates="fraud_alerts")
    resolved_by = db.relationship("User", back_populates="fraud_alerts_resolved", foreign_keys=[resolved_by_id])


class Assignment(db.Model):
    __tablename__ = "assignments"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    budget = db.Column(db.Float, nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="Pending Review")
    priority = db.Column(db.String(20), nullable=False, default="Medium")
    client_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    assigned_by_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    assigned_at = db.Column(db.DateTime)
    reviewed_by_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime)
    admin_notes = db.Column(db.Text)
    revision_notes = db.Column(db.Text)
    files = db.Column(db.JSON)  # Store file references as JSON array
    timeline = db.Column(db.JSON, default=list)
    final_price = db.Column(db.Float, nullable=True)
    selected_proposal_id = db.Column(db.String(36), nullable=True)
    client_amendment_notes = db.Column(db.Text)
    negotiation_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    client = db.relationship("User", foreign_keys=[client_id])
    worker = db.relationship("User", foreign_keys=[worker_id])
    assigned_by = db.relationship("User", foreign_keys=[assigned_by_id])
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])
    proposals = db.relationship("GigProposal", back_populates="assignment", cascade="all, delete-orphan", foreign_keys="GigProposal.assignment_id")
    client_name = db.Column(db.String(255))
    client_email = db.Column(db.String(255))
    client_phone = db.Column(db.String(50))


class GigProposal(db.Model):
    __tablename__ = "gig_proposals"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    assignment_id = db.Column(db.String(36), db.ForeignKey("assignments.id"), nullable=False)
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    proposed_amount = db.Column(db.Float, nullable=False)
    adjusted_amount = db.Column(db.Float, nullable=True)
    final_amount = db.Column(db.Float, nullable=True)
    cover_letter = db.Column(db.Text, nullable=False)
    estimated_days = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(50), nullable=False, default="Pending")
    admin_notes = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)
    price_adjust_type = db.Column(db.String(20))  # percentage | amount
    price_adjust_value = db.Column(db.Float)
    reviewed_by_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime)
    sent_to_client_at = db.Column(db.DateTime)
    client_selected_at = db.Column(db.DateTime)
    client_amendment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignment = db.relationship("Assignment", back_populates="proposals", foreign_keys=[assignment_id])
    worker = db.relationship("User", foreign_keys=[worker_id])
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])

    __table_args__ = (db.UniqueConstraint("assignment_id", "worker_id", name="uq_gig_proposal_assignment_worker"),)

class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    assignment_id = db.Column(db.String(36), db.ForeignKey("assignments.id"), nullable=False)
    worker_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    deliverable_file = db.Column(db.Text)  # File path or URL
    deliverable_link = db.Column(db.Text)  # URL alternative
    submission_notes = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False, default="Submitted for Review")
    review_notes = db.Column(db.Text)

    # Relationships
    assignment = db.relationship("Assignment", backref=db.backref("submissions", lazy=True))
    worker = db.relationship("User", foreign_keys=[worker_id])


class AssignmentMessage(db.Model):
    __tablename__ = "assignment_messages"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    assignment_id = db.Column(db.String(36), db.ForeignKey("assignments.id"), nullable=False)
    sender_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    visibility = db.Column(db.String(32), nullable=False, default="PARTICIPANTS")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assignment = db.relationship("Assignment", backref=db.backref("messages", lazy=True, cascade="all, delete-orphan"))
    sender = db.relationship("User", foreign_keys=[sender_id])

class ReferralRate(db.Model):
    __tablename__ = "referral_rates"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    platform_id = db.Column(db.String(36), db.ForeignKey("platform_types.id"), nullable=True)
    tier = db.Column(db.String(32), nullable=False, default="DEFAULT")
    action = db.Column(db.String(64), nullable=False, default="CONVERSION")
    rate = db.Column(db.Float, nullable=False, default=100.0)
    is_percentage = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_by_id = db.Column(db.String(36), db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    platform = db.relationship("PlatformType")
    created_by = db.relationship("User")

    __table_args__ = (db.UniqueConstraint("platform_id", "tier", "action", name="unique_platform_tier_action_rate"),)


class AssignmentCategory(db.Model):
    __tablename__ = "assignment_categories"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AssignmentWorker(db.Model):
    __tablename__ = "assignment_workers"

    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref="assignment_worker_profile")

