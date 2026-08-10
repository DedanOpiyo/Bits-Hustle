"""Pages routes stubbed — templates removed; API-only server."""

from flask import Blueprint, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/activity-feed")
def activity_feed():
    return jsonify({"message": "Use /api/activities endpoint"}), 200


@pages_bp.route("/ambassadors")
def ambassadors_page():
    return jsonify({"message": "Use /api/ambassadors endpoint"}), 200


@pages_bp.route("/referrals")
def referrals_page():
    return jsonify({"message": "Use /api/referrals endpoint"}), 200


@pages_bp.route("/check-ins")
def check_ins_page():
    return jsonify({"message": "Use /api/check-ins endpoint"}), 200


@pages_bp.route("/learning-resources")
def learning_page():
    return jsonify({"message": "Use /api/learning-resources endpoint"}), 200


@pages_bp.route("/notifications")
def notifications_page():
    return jsonify({"message": "Use /api/notifications endpoint"}), 200


@pages_bp.route("/notification-center")
def notification_center_page():
    return jsonify({"message": "Use /api/notifications endpoint"}), 200


@pages_bp.route("/task-submissions")
def task_submissions_page():
    return jsonify({"message": "Use /api/task-submissions endpoint"}), 200


@pages_bp.route("/my-appeals")
def my_appeals_page():
    return jsonify({"message": "Use /api/appeals endpoint"}), 200


@pages_bp.route("/audit-logs")
def audit_logs_page():
    return jsonify({"message": "Use /api/audit-logs endpoint"}), 200


@pages_bp.route("/fraud-alerts")
def fraud_alerts_page():
    return jsonify({"message": "Use /api/fraud-alerts endpoint"}), 200


@pages_bp.route("/leaderboard")
def leaderboard_page():
    return jsonify({"message": "Use /api/leaderboard endpoint"}), 200


@pages_bp.route("/login")
def login():
    return jsonify({"message": "Use /api/auth/login endpoint"}), 200


@pages_bp.route("/register")
def register():
    return jsonify({"message": "Use /api/auth/register endpoint"}), 200


@pages_bp.route("/my-tasks")
def my_tasks():
    return jsonify({"message": "Use /api/tasks endpoint"}), 200


@pages_bp.route("/my-leads")
def my_leads():
    return jsonify({"message": "Use /api/leads endpoint"}), 200


@pages_bp.route("/users")
def users_page():
    return jsonify({"message": "Use /api/users endpoint"}), 200


@pages_bp.route("/hubs")
def hubs_page():
    return jsonify({"message": "Use /api/hubs endpoint"}), 200


@pages_bp.route("/wallets")
def wallets_page():
    return jsonify({"message": "Use /api/wallets endpoint"}), 200


@pages_bp.route("/campaigns")
def campaigns_page():
    return jsonify({"message": "Use /api/campaigns endpoint"}), 200


@pages_bp.route("/leads")
def leads_page():
    return jsonify({"message": "Use /api/leads endpoint"}), 200


@pages_bp.route("/tasks")
def tasks_page():
    return jsonify({"message": "Use /api/tasks endpoint"}), 200


@pages_bp.route("/payouts")
def payouts_page():
    return jsonify({"message": "Use /api/payout-requests endpoint"}), 200


@pages_bp.route("/badges")
def badges_page():
    return jsonify({"message": "Use /api/badges endpoint"}), 200


@pages_bp.route("/role_types")
def role_types_page():
    return jsonify({"message": "Use /api/role-types endpoint"}), 200


@pages_bp.route("/platform_types")
def platform_types_page():
    return jsonify({"message": "Use /api/platform-types endpoint"}), 200


@pages_bp.route("/task_type_types")
def task_type_types_page():
    return jsonify({"message": "Use /api/task-type-types endpoint"}), 200


@pages_bp.route("/task_status_types")
def task_status_types_page():
    return jsonify({"message": "Use /api/task-status-types endpoint"}), 200


@pages_bp.route("/lead_status_types")
def lead_status_types_page():
    return jsonify({"message": "Use /api/lead-status-types endpoint"}), 200


@pages_bp.route("/payout_status_types")
def payout_status_types_page():
    return jsonify({"message": "Use /api/payout-status-types endpoint"}), 200


@pages_bp.route("/permissions")
def permissions_page():
    return jsonify({"message": "Use /api/permissions endpoint"}), 200


@pages_bp.route("/role_permissions")
def role_permissions_page():
    return jsonify({"message": "Use /api/role-permissions endpoint"}), 200


@pages_bp.route("/transactions")
def transactions_page():
    return jsonify({"message": "Use /api/transactions endpoint"}), 200


@pages_bp.route("/user_settings")
def user_settings_page():
    return jsonify({"message": "Use /api/user-settings endpoint"}), 200


@pages_bp.route("/announcements")
def announcements_page():
    return jsonify({"message": "Use /api/announcements endpoint"}), 200


@pages_bp.route("/support-tickets")
def support_tickets_page():
    return jsonify({"message": "Use /api/support-tickets endpoint"}), 200


@pages_bp.route("/profile")
def profile_page():
    return jsonify({"message": "Use /api/auth/profile endpoint"}), 200


@pages_bp.route("/analytics")
def analytics_page():
    return jsonify({"message": "Use /api/analytics endpoint"}), 200


@pages_bp.route("/my-badges")
def my_badges_page():
    return jsonify({"message": "Use /api/badges endpoint"}), 200


@pages_bp.route("/my-support-tickets")
def my_support_tickets_page():
    return jsonify({"message": "Use /api/support-tickets endpoint"}), 200

