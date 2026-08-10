from flask import Blueprint
from app.routes.auth import auth_bp
from app.routes.users import users_bp
from app.routes.ambassadors import ambassadors_bp
from app.routes.hubs import hubs_bp
from app.routes.wallets import wallets_bp
from app.routes.campaigns import campaigns_bp
from app.routes.tasks import tasks_bp
from app.routes.task_submissions import task_submissions_bp
from app.routes.leads import leads_bp
from app.routes.referrals import referrals_bp
from app.routes.check_ins import check_ins_bp
from app.routes.announcements import announcements_bp
from app.routes.notifications import notifications_bp
from app.routes.support_tickets import support_tickets_bp
from app.routes.badges import badges_bp
from app.routes.appeals import appeals_bp
from app.routes.payout_requests import payout_requests_bp
from app.routes.leaderboard import leaderboard_bp
from app.routes.learning_resources import learning_resources_bp
from app.routes.reports import reports_bp
from app.routes.analytics import analytics_bp
from app.routes.fraud_alerts import fraud_alerts_bp
from app.routes.activity_feed import activity_feed_bp
from app.routes.audit_logs import audit_logs_bp
from app.routes.task_system import task_system_bp
from app.routes.platforms import platforms_bp
from app.routes.webhooks import webhooks_bp
from app.routes.referral_rates import referral_rates_bp
from app.routes.role_types import role_types_bp
from app.routes.task_type_types import task_type_types_bp
from app.routes.tier_types import tier_types_bp
from app.routes.action_types import action_types_bp
from app.routes.platform_api_keys import platform_api_keys_bp
from app.routes.platform_actions import platform_actions_bp
from app.routes.lead_status_types import lead_status_types_bp
from app.routes.permissions import permissions_bp
from app.routes.role_permissions import role_permissions_bp
from app.routes.uploads import uploads_bp
from app.routes.assignments import assignments_bp
from app.routes.assignment_categories import assignment_categories_bp


all_blueprints = [
    auth_bp,
    users_bp,
    ambassadors_bp,
    hubs_bp,
    wallets_bp,
    campaigns_bp,
    tasks_bp,
    task_submissions_bp,
    leads_bp,
    referrals_bp,
    check_ins_bp,
    announcements_bp,
    notifications_bp,
    support_tickets_bp,
    badges_bp,
    appeals_bp,
    payout_requests_bp,
    leaderboard_bp,
    learning_resources_bp,
    reports_bp,
    analytics_bp,
    fraud_alerts_bp,
    activity_feed_bp,
    audit_logs_bp,
    task_system_bp,
    platforms_bp,
    webhooks_bp,
    referral_rates_bp,
    role_types_bp,
    task_type_types_bp,
    tier_types_bp,
    action_types_bp,
    platform_api_keys_bp,
    platform_actions_bp,
    lead_status_types_bp,
    permissions_bp,
    role_permissions_bp,
    uploads_bp,
    assignments_bp,
    assignment_categories_bp,
]


web_blueprints = []


def register_all_blueprints(app):
    prefix = "/api"
    for bp in all_blueprints:
        app.register_blueprint(bp, url_prefix=prefix)

