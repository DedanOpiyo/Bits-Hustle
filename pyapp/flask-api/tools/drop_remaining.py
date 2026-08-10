"""Drop remaining old-duplicate tables with 0 rows."""
import pymysql

conn = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cur = conn.cursor()
cur.execute('SET FOREIGN_KEY_CHECKS = 0')
try:
    for t in ['task', 'transaction', 'learningresource', '_prisma_migrations']:
        cur.execute(f'DROP TABLE IF EXISTS `{t}`')
        print(f'Dropped {t}')
    conn.commit()
    print('\nDone.')
finally:
    cur.execute('SET FOREIGN_KEY_CHECKS = 1')
    cur.close()
    conn.close()
