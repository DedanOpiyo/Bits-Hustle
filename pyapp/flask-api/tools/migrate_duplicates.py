"""Migrate remaining old-table data into new tables, then drop duplicates."""

import pymysql

conn = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cur = conn.cursor()


def rows(table):
    cur.execute(f'SELECT COUNT(*) FROM `{table}`')
    return cur.fetchone()[0]


def fetchall(table, columns):
    cur.execute(f'SELECT {", ".join(columns)} FROM `{table}`')
    return cur.fetchall()


def insert(table, columns, values):
    cols = ', '.join(columns)
    placeholders = ', '.join(['%s'] * len(columns))
    cur.execute(f'INSERT INTO `{table}` ({cols}) VALUES ({placeholders})', values)


def table_has_col(table, col):
    cur.execute(f'SHOW COLUMNS FROM `{table}` WHERE Field = %s', (col,))
    return cur.fetchone() is not None


def drop_table(name):
    cur.execute(f'DROP TABLE IF EXISTS `{name}`')
    print(f'  Dropped {name}')


cur.execute('SET FOREIGN_KEY_CHECKS = 0')

try:
    # ── 1. Migrate hubs from old `hub` (3 rows) → `hubs` (1 row) ──────
    print('--- Migrating hubs ---')
    hub_count = rows('hub')
    if hub_count > 0:
        cur.execute('SHOW COLUMNS FROM `hub`')
        old_hub_cols = [r[0] for r in cur.fetchall()]
        cur.execute('SHOW COLUMNS FROM `hubs`')
        new_hub_cols = [r[0] for r in cur.fetchall()]
        # Map old Prisma column names → new snake_case
        col_map = {
            'id': 'id',
            'name': 'name',
            'location': 'location',
            'qrCode': 'qr_code',
            'managerId': 'manager_id',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
        }
        shared = [(old, col_map[old]) for old in old_hub_cols if old in col_map and col_map[old] in new_hub_cols]
        old_names = [c[0] for c in shared]
        new_names = [c[1] for c in shared]
        cur.execute(f'SELECT {", ".join(old_names)} FROM `hub`')
        old_rows = cur.fetchall()
        migrated = 0
        for r in old_rows:
            val_dict = dict(zip(old_names, r))
            # Skip if ID already in hubs
            h_id = val_dict.get('id')
            if h_id:
                cur.execute('SELECT COUNT(*) FROM hubs WHERE id = %s', (h_id,))
                if cur.fetchone()[0] > 0:
                    continue
            if val_dict.get('managerId'):
                insert('hubs', new_names, tuple(val_dict.get(o) for o in old_names))
                migrated += 1
        print(f'  Migrated {migrated} hubs')
    else:
        print('  No hub rows to migrate')

    # ── 2. Migrate permissions from old `permission` (79 rows) → `permissions` (0 rows) ──
    print('--- Migrating permissions ---')
    if rows('permission') > 0:
        col_map_perm = {
            'id': 'id',
            'name': 'name',
            'description': 'description',
            'resource': 'resource',
            'action': 'action',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
        }
        cur.execute('SHOW COLUMNS FROM `permission`')
        old_p_cols = [r[0] for r in cur.fetchall()]
        cur.execute('SHOW COLUMNS FROM `permissions`')
        new_p_cols = [r[0] for r in cur.fetchall()]
        shared_p = [(old, col_map_perm[old]) for old in old_p_cols if old in col_map_perm and col_map_perm[old] in new_p_cols]
        old_p_names = [c[0] for c in shared_p]
        new_p_names = [c[1] for c in shared_p]
        cur.execute(f'SELECT {", ".join(old_p_names)} FROM `permission`')
        old_p_rows = cur.fetchall()
        migrated_p = 0
        for r in old_p_rows:
            old_dict = dict(zip(old_p_names, r))
            p_id = old_dict.get('id')
            if p_id:
                cur.execute('SELECT COUNT(*) FROM permissions WHERE id = %s', (p_id,))
                if cur.fetchone()[0] > 0:
                    continue
            insert('permissions', new_p_names, tuple(old_dict.get(o) for o in old_p_names))
            migrated_p += 1
        print(f'  Migrated {migrated_p} permissions')
    else:
        print('  No permission rows to migrate')

    # ── 3. Migrate role_permissions from old `rolepermission` → `role_permissions` ──
    print('--- Migrating role_permissions ---')
    if rows('rolepermission') > 0:
        col_map_rp = {
            'id': 'id',
            'roleId': 'role_id',
            'permissionId': 'permission_id',
            'createdAt': 'created_at',
        }
        cur.execute('SHOW COLUMNS FROM `rolepermission`')
        old_rp_cols = [r[0] for r in cur.fetchall()]
        cur.execute('SHOW COLUMNS FROM `role_permissions`')
        new_rp_cols = [r[0] for r in cur.fetchall()]
        shared_rp = [(old, col_map_rp[old]) for old in old_rp_cols if old in col_map_rp and col_map_rp[old] in new_rp_cols]
        old_rp_names = [c[0] for c in shared_rp]
        new_rp_names = [c[1] for c in shared_rp]
        cur.execute(f'SELECT {", ".join(old_rp_names)} FROM `rolepermission`')
        old_rp_rows = cur.fetchall()
        migrated_rp = 0
        for r in old_rp_rows:
            old_dict = dict(zip(old_rp_names, r))
            rp_id = old_dict.get('id')
            if rp_id:
                cur.execute('SELECT COUNT(*) FROM role_permissions WHERE id = %s', (rp_id,))
                if cur.fetchone()[0] > 0:
                    continue
            insert('role_permissions', new_rp_names, tuple(old_dict.get(o) for o in old_rp_names))
            migrated_rp += 1
        print(f'  Migrated {migrated_rp} role_permissions')
    else:
        print('  No role_permission rows to migrate')

    # ── 4. Drop all old duplicate tables ──────────────────────────────
    print('--- Dropping old duplicate tables ---')
    drop_list = [
        'roletype', 'platformtype', 'tasktypetype', 'taskstatustype',
        'leadstatustype', 'payoutstatustype', 'permission', 'usersetting',
        'user', 'fraudalert', 'referral', 'announcement', 'badge',
        'supportticket', 'tasksubmission', 'hub', 'auditlog',
        'payoutrequest', 'wallet', 'lead', 'checkin', 'notification',
        'campaign', 'ambassadorbadge', 'rolepermission',
    ]
    for t in drop_list:
        drop_table(t)

    conn.commit()
    print('\nDone. Remaining tables:')
    cur.execute('SHOW TABLES')
    print('\n'.join(f'  {r[0]}' for r in cur.fetchall()))

finally:
    cur.execute('SET FOREIGN_KEY_CHECKS = 1')
    cur.close()
    conn.close()
