import pymysql
connection = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cursor = connection.cursor()
cursor.execute('SHOW COLUMNS FROM leads')
print('Leads table columns:')
columns = []
for row in cursor.fetchall():
    columns.append(row[0])
    null_str = 'NULL' if row[2] == 'YES' else 'NOT NULL'
    key_str = ''
    if row[3] == 'PRI':
        key_str = 'PRI'
    elif row[3] == 'MUL':
        key_str = 'MUL'
    print('  {}: {} {} {}'.format(row[0], row[1], null_str, key_str))
print()
print('Checking for platform_id column...')
if 'platform_id' in columns:
    print('PASS: platform_id column exists')
else:
    print('FAIL: platform_id column missing')

# Check foreign key
cursor.execute('''
    SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
    FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE 
        TABLE_SCHEMA = 'bitshustle' 
        AND TABLE_NAME = 'leads'
        AND REFERENCED_TABLE_NAME = 'platform_types'
''')
fk_results = cursor.fetchall()
print()
print('Foreign key constraints to platform_types:')
if fk_results:
    for fk in fk_results:
        print('  PASS: {}: {} -> {}.{}'.format(fk[0], fk[1], fk[2], fk[3]))
else:
    print('  FAIL: No foreign key constraint found to platform_types')

cursor.close()
connection.close()