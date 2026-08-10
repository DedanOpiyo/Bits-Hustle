import pymysql
connection = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k\$ett',
    database='bitshustle'
)
cursor = connection.cursor()
cursor.execute('SHOW COLUMNS FROM leads')
print('Current leads table structure:')
for row in cursor.fetchall():
    print(row)
print()

# Check if platform_id column exists
columns = [row[0] for row in cursor.fetchall()]
print('Columns:', columns)
if 'platform_id' not in columns:
    print('Adding platform_id column to leads table...')
    try:
        cursor.execute('ALTER TABLE leads ADD COLUMN platform_id VARCHAR(36) NOT NULL')
        cursor.execute('ALTER TABLE leads ADD CONSTRAINT fk_leads_platform_id FOREIGN KEY (platform_id) REFERENCES platform_types(id)')
        connection.commit()
        print('Successfully added platform_id column and foreign key constraint')
    except Exception as e:
        print('Error adding column:', str(e))
        connection.rollback()
else:
    print('platform_id column already exists')

cursor.close()
connection.close()