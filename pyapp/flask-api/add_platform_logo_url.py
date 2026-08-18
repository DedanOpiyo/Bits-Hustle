import pymysql

connection = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cursor = connection.cursor()

cursor.execute('SHOW COLUMNS FROM platform_types')
columns = [row[0] for row in cursor.fetchall()]

if 'logo_url' not in columns:
    cursor.execute('ALTER TABLE platform_types ADD COLUMN logo_url VARCHAR(512) DEFAULT NULL')
    connection.commit()
    print('Successfully added logo_url column to platform_types')
else:
    print('logo_url column already exists')

cursor.close()
connection.close()
