import pymysql

conn = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cur = conn.cursor()
cur.execute('SHOW TABLES')
all_tables = [r[0] for r in cur.fetchall()]

old_tables = [
    'roletype', 'platformtype', 'tasktypetype', 'taskstatustype', 'leadstatustype',
    'payoutstatustype', 'permission', 'usersetting', 'user',
    'fraudalert', 'referral', 'announcement', 'badge', 'supportticket',
    'tasksubmission', 'hub', 'auditlog', 'payoutrequest', 'wallet', 'lead',
    'checkin', 'notification', 'campaign', '_prisma_migrations',
    'ambassadorbadge', 'ambassador_badges', 'rolepermission'
]

old_existing = [t for t in old_tables if t in all_tables]

print('Old/duplicate tables still in DB:')
for t in old_existing:
    print(f'  {t}')

correct_counterpart_map = {
    'roletype': 'role_types',
    'platformtype': 'platform_types',
    'tasktypetype': 'task_type_types',
    'taskstatustype': 'task_status_types',
    'leadstatustype': 'lead_status_types',
    'payoutstatustype': 'payout_status_types',
    'permission': 'permissions',
    'usersetting': 'user_settings',
    'user': 'users',
    'fraudalert': 'fraud_alerts',
    'referral': 'referrals',
    'announcement': 'announcements',
    'badge': 'badges',
    'supportticket': 'support_tickets',
    'tasksubmission': 'task_submissions',
    'hub': 'hubs',
    'auditlog': 'audit_logs',
    'payoutrequest': 'payout_requests',
    'wallet': 'wallets',
    'lead': 'leads',
    'checkin': 'check_ins',
    'notification': 'notifications',
    'campaign': 'campaigns',
    '_prisma_migrations': None,
    'ambassadorbadge': 'ambassador_badges',
    'rolepermission': 'role_permissions',
}

print()
for old in old_existing:
    counterpart = correct_counterpart_map.get(old)
    if counterpart and counterpart in all_tables:
        try:
            cur.execute(f'SELECT COUNT(*) FROM {old}')
            old_count = cur.fetchone()[0]
            cur.execute(f'SELECT COUNT(*) FROM {counterpart}')
            new_count = cur.fetchone()[0]
            print(f'  {old} ({old_count} rows) -> DROP  |  {counterpart} ({new_count} rows) -> KEEP')
        except Exception as e:
            print(f'  {old}: error counting rows: {e}')
    else:
        if old == '_prisma_migrations':
            print(f'  {old}: DROP (Prisma migration tracking table, no counterpart needed)')
        else:
            print(f'  {old}: DROP (no counterpart found)')

cur.close()
conn.close()
