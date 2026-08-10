"""Migrations CLI: invoke with `python migrate.py up|down|seed`"""

import uuid, os, sys
from flask import current_app
from app.extensions import db
from app.models import (
    RoleType, PlatformType, TaskTypeType, TaskStatusType, LeadStatusType,
    PayoutStatusType, TierType, ActionType, PlatformApiKey, Permission, RolePermission, User, Hub, Ambassador, Wallet,
    Transaction, Campaign, Task, TaskSubmission, Lead, Referral, CheckIn,
    Announcement, Notification, SupportTicket, LearningResource, Badge,
    AmbassadorBadge, Appeal, AuditLog, PayoutRequest, FraudAlert,
)
from app.utils.auth import hash_password
from app.utils.serializers import to_dict
from flask_migrate import upgrade, downgrade, init, migrate as flask_migrate_cmd
from datetime import datetime, timedelta
from app.factory import create_app


def main():
    app = create_app()
    with app.app_context():
        from flask_migrate import upgrade, downgrade, init, migrate as flask_migrate_cmd

        action = sys.argv[1] if len(sys.argv) > 1 else "up"

        if action == "init":
            init()
            print("Flask-Migrate initialised.")
        elif action == "up":
            upgrade()
            print("Migrations applied.")
        elif action == "down":
            downgrade("base")
            print("Migrations rolled back.")
        elif action == "revision":
            flask_migrate_cmd()
            print("Revision created.")
        elif action == "seed":
            from seed import seed
            seed()
        else:
            print(f"unknown action: {action}")


if __name__ == "__main__":
    main()
