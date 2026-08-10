"""Service for checking and managing role permissions."""

from typing import List
from app.extensions import db
from app.models import User, RoleType, Permission, RolePermission


class RolePermissionService:
    """Service for role-based permission checking and management."""

    PERMISSIONS = {
        "SUPER_ADMIN": [
            "users:create", "users:read", "users:update", "users:delete",
            "hubs:create", "hubs:read", "hubs:update", "hubs:delete",
            "campaigns:create", "campaigns:read", "campaigns:update", "campaigns:delete",
            "tasks:create", "tasks:read", "tasks:update", "tasks:delete",
            "task_submissions:read", "task_submissions:review",
            "payout_requests:create", "payout_requests:read", "payout_requests:update", "payout_requests:approve", "payout_requests:reject",
            "leads:read", "leads:update",
            "referrals:read", "referral_rates:create",
            "reports:read", "analytics:read",
            "announcements:create", "announcements:read", "announcements:update", "announcements:delete",
            "wallet:read", "wallets:read", "transactions:read",
            "audit_logs:read",
            "fraud_alerts:read", "fraud_alerts:resolve", "fraud_alerts:create",
            "support_tickets:read", "support_tickets:assign", "support_tickets:reply", "support_tickets:manage", "support_tickets:create", "support_tickets:escalate",
            "learning_resources:create", "learning_resources:read", "learning_resources:update", "learning_resources:delete",
            "leaderboard:read",
            "notifications:read",
            "check_ins:create", "check_ins:read",
            "badges:manage",
            "platforms:create", "platforms:read", "platforms:update",
            "permissions:create", "permissions:read", "permissions:update", "permissions:delete",
            "hub_manager:access",
            "finance:read",
            "ambassadors:read", "ambassadors:update",
            "attendance:read", "attendance:verify",
            "assignments:manage",
        ],
        "HUB_MANAGER": [
            "hub_manager:access",
            "ambassadors:read",
            "check_ins:read", "attendance:read",
            "tasks:read", "task_submissions:read", "task_submissions:review",
            "leads:read", "leads:update",
            "announcements:create", "announcements:read",
            "reports:read", "analytics:read",
            "wallets:read", "transactions:read",
            "attendance:verify",
            "fraud_alerts:read", "fraud_alerts:create",
            "support_tickets:read", "support_tickets:escalate",
            "learning_resources:create", "learning_resources:read", "learning_resources:update",
            "leaderboard:read",
            "notifications:read",
            "payout_requests:read",
            "campaigns:read",
            "users:read",
        ],
        "AMBASSADOR": [
            "ambassador:access",
            "check_ins:create", "check_ins:read",
            "tasks:read", "task_submissions:create", "task_submissions:read",
            "leads:create", "leads:read",
            "campaigns:read",
            "referrals:create", "referrals:read",
            "wallets:read", "transactions:read",
            "payout_requests:create", "payout_requests:read",
            "learning_resources:read",
            "leaderboard:read",
            "announcements:read",
            "support_tickets:create", "support_tickets:read",
            "notifications:read",
            "appeals:read",
        ],
        "FINANCE_OFFICER": [
            "finance:read",
            "wallets:read", "transactions:read",
            "payout_requests:read", "payout_requests:approve", "payout_requests:reject",
            "reports:read", "analytics:read",
            "audit_logs:read",
            "ambassadors:read",
            "fraud_alerts:read", "fraud_alerts:resolve",
            "users:read",
            "campaigns:read",
            "leaderboard:read",
            "notifications:read",
        ],
        "SUPPORT_OFFICER": [
            "support_tickets:read", "support_tickets:reply", "support_tickets:update", "support_tickets:manage", "support_tickets:escalate",
            "users:read",
            "ambassadors:read",
            "appeals:read", "appeals:update",
            "campaigns:read",
            "notifications:read",
        ],
        "PARTNER_ADVERTISER": [
            "campaigns:create", "campaigns:read", "campaigns:update",
            "tasks:create", "tasks:read", "tasks:update",
            "analytics:read",
            "notifications:read",
        ],
        "ADMIN": [
            "assignments:manage",
        ],
    }

    @staticmethod
    def has_permission(user: User, resource: str, action: str) -> bool:
        if not user or not user.is_active:
            return False
        role = user.role
        if not role or not role.is_active:
            return False
        perm_name = "{}:{}".format(resource, action)
        return perm_name in RolePermissionService.PERMISSIONS.get(role.name, [])

    @staticmethod
    def has_role(user: User, *role_names: str) -> bool:
        if not user or not user.is_active:
            return False
        role = user.role
        return role and role.name in role_names

    @staticmethod
    def get_user_permissions(user: User) -> List[str]:
        if not user or not user.is_active or not user.role:
            return []
        return RolePermissionService.PERMISSIONS.get(user.role.name, [])

    @staticmethod
    def user_can_access_hub(user: User, hub_id: str) -> bool:
        from app.models import Hub
        if not user or not user.is_active:
            return False
        if RolePermissionService.has_role(user, "SUPER_ADMIN"):
            return True
        if RolePermissionService.has_role(user, "HUB_MANAGER"):
            hub = db.session.get(Hub, hub_id)
            if hub and hub.manager_id == user.id:
                return True
        return False

    @staticmethod
    def can_review_task(user: User, task_submission) -> bool:
        if not user or not user.is_active:
            return False
        if not task_submission or not task_submission.ambassador:
            return False
        if RolePermissionService.has_role(user, "SUPER_ADMIN"):
            return True
        if RolePermissionService.has_role(user, "HUB_MANAGER"):
            hub = task_submission.ambassador.hub
            return hub and hub.manager_id == user.id
        if RolePermissionService.has_role(user, "FINANCE_OFFICER"):
            return False
        return False

    @staticmethod
    def can_approve_payout(user: User) -> bool:
        if not user or not user.is_active:
            return False
        return RolePermissionService.has_role(user, "SUPER_ADMIN", "FINANCE_OFFICER")

    @staticmethod
    def seed_permissions():
        permissions_created = 0
        role_perms_created = 0
        for role_name, perm_list in RolePermissionService.PERMISSIONS.items():
            role = RoleType.query.filter_by(name=role_name).first()
            if not role:
                continue
            for perm_name in perm_list:
                resource, action = perm_name.split(":")
                perm = Permission.query.filter_by(name=perm_name).first()
                if not perm:
                    desc = action.title() + " " + resource.replace("_", " ")
                    perm = Permission(name=perm_name, description=desc, resource=resource, action=action)
                    db.session.add(perm)
                    permissions_created += 1
                existing_rp = RolePermission.query.filter_by(role_id=role.id, permission_id=perm.id).first()
                if not existing_rp:
                    rp = RolePermission(role_id=role.id, permission_id=perm.id)
                    db.session.add(rp)
                    role_perms_created += 1
        db.session.commit()
        return {"permissions": permissions_created, "role_permissions": role_perms_created}