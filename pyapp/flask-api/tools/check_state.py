"""Check current state of all tables in the database."""
import pymysql

conn = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cur = conn.cursor()

tables = [
    'role_types', 'platform_types', 'task_type_types', 'task_status_types',
    'lead_status_types', 'payout_status_types', 'permissions',
    'role_permissions', 'users', 'hubs', 'ambassadors', 'wallets',
    'transactions', 'campaigns', 'tasks', 'task_submissions', 'leads',
    'referrals', 'check_ins', 'announcements', 'notifications',
    'support_tickets', 'learning_resources', 'badges', 'ambassador_badges',
    'appeals', 'audit_logs', 'payout_requests', 'fraud_alerts', 'user_settings',
    'task', 'transaction', 'learningresource', '_prisma_migrations'
]

for t in tables:
    cur.execute(f'SHOW TABLES LIKE %s', (t,))
    r = cur.fetchone()
    if r:
        cur.execute(f'SELECT COUNT(*) FROM `{t}`')
        cnt = cur.fetchone()[0]
        print(f'  {t:35s}: {cnt} rows')
    else:
        print(f'  {t:35s}: NOT FOUND')

# Show existing role_types
cur.execute('SELECT id, name, display_name FROM role_types')
roles = cur.fetchall()
print('\nRoleTypes:')
for r in roles:
    print(f'  {r[0]}: {r[1]} ({r[2]})')

# Show existing platform_types
cur.execute('SELECT id, name, display_name FROM platform_types')
platforms = cur.fetchall()
print('\nPlatformTypes:')
for p in platforms:
    print(f'  {p[0]}: {p[1]} ({p[2]})')

cur.close()
conn.close()
