import pymysql
conn = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cur = conn.cursor()
tables = ['learningresource','task','transaction','learning_resources','tasks','transactions','_prisma_migrations']
for t in tables:
    cur.execute(f'SHOW TABLES LIKE %s', (t,))
    r = cur.fetchone()
    if r:
        cur.execute(f'SELECT COUNT(*) FROM `{t}`')
        cnt = cur.fetchone()[0]
        print(f'{t}: {cnt} rows')
    else:
        print(f'{t}: NOT FOUND')
cur.close()
conn.close()
