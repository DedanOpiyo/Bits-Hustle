"""UI routes stubbed — templates removed; API-only server."""

from flask import Blueprint, jsonify

ui_bp = Blueprint('ui', __name__)


@ui_bp.route('/')
def index():
    return jsonify({"message": "BitsHustle API — no UI served"}), 200


@ui_bp.route('/dashboard')
def dashboard():
    return jsonify({"message": "Use /api/dashboard endpoint"}), 200


@ui_bp.route('/leads')
def leads_list():
    return jsonify({"message": "Use /api/leads endpoint"}), 200


@ui_bp.route('/leads/new', methods=['GET', 'POST'])
def lead_new():
    return jsonify({"message": "Use /api/leads endpoint"}), 200


@ui_bp.route('/tasks')
def tasks_list():
    return jsonify({"message": "Use /api/tasks endpoint"}), 200


@ui_bp.route('/tasks/new', methods=['GET', 'POST'])
def task_new():
    return jsonify({"message": "Use /api/tasks endpoint"}), 200


@ui_bp.route('/payouts')
def payouts_list():
    return jsonify({"message": "Use /api/payout-requests endpoint"}), 200


@ui_bp.route('/payouts/new', methods=['GET', 'POST'])
def payout_new():
    return jsonify({"message": "Use /api/payout-requests endpoint"}), 200


@ui_bp.route('/leaderboard')
def leaderboard():
    return jsonify({"message": "Use /api/leaderboard endpoint"}), 200


@ui_bp.route('/login', methods=['GET', 'POST'])
def login():
    return jsonify({"message": "Use /api/auth/login endpoint"}), 200


@ui_bp.route('/logout')
def logout():
    return jsonify({"message": "Use /api/auth/logout endpoint"}), 200


@ui_bp.route('/fraud-policy')
def fraud_policy():
    return jsonify({"message": "Policy document — not available in API mode"}), 200


@ui_bp.route('/inactivity-policy')
def inactivity_policy():
    return jsonify({"message": "Policy document — not available in API mode"}), 200


@ui_bp.route('/referral-policy')
def referral_policy():
    return jsonify({"message": "Policy document — not available in API mode"}), 200


@ui_bp.route('/hub-fee-policy')
def hub_fee_policy():
    return jsonify({"message": "Policy document — not available in API mode"}), 200


@ui_bp.route('/partner-campaign-approval-policy')
def partner_campaign_approval_policy():
    return jsonify({"message": "Policy document — not available in API mode"}), 200

