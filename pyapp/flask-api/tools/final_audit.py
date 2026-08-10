"""Quick audit of all table row counts."""
import sys
sys.path.insert(0, r'D:\nzuki2025\bitshustle\pyapp\flask-api')
from app.factory import create_app

app = create_app()
with app.app_context():
    from app.models import (
        RoleType, PlatformType, TaskTypeType, TaskStatusType, LeadStatusType,
        PayoutStatusType, Permission, RolePermission, User, Hub, Ambassador, Wallet,
        Transaction, Campaign, Task, TaskSubmission, Lead, Referral, CheckIn,
        Announcement, Notification, SupportTicket, LearningResource, Badge,
        AmbassadorBadge, Appeal, AuditLog, PayoutRequest, FraudAlert, UserSetting,
    )

    tables = [
        ("role_types",          RoleType),
        ("platform_types",      PlatformType),
        ("task_type_types",     TaskTypeType),
        ("task_status_types",   TaskStatusType),
        ("lead_status_types",   LeadStatusType),
        ("payout_status_types", PayoutStatusType),
        ("permissions",         Permission),
        ("role_permissions",    RolePermission),
        ("users",               User),
        ("user_settings",       UserSetting),
        ("hubs",                Hub),
        ("ambassadors",         Ambassador),
        ("badges",              Badge),
        ("wallets",             Wallet),
        ("campaigns",           Campaign),
        ("tasks",               Task),
        ("leads",               Lead),
        ("referrals",           Referral),
        ("check_ins",           CheckIn),
        ("announcements",       Announcement),
        ("notifications",       Notification),
        ("support_tickets",     SupportTicket),
        ("learning_resources",  LearningResource),
        ("appeals",             Appeal),
        ("audit_logs",          AuditLog),
        ("payout_requests",     PayoutRequest),
        ("fraud_alerts",        FraudAlert),
        ("transactions",        Transaction),
    ]

    print(f"{'Table':<32} {'Rows':>6}")
    print("-" * 42)
    for name, model in tables:
        cnt = model.query.count()
        flag = " [seeded]" if cnt > 0 else ""
        print(f"  {name:<30} {cnt:>6}{flag}")
