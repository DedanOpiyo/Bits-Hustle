import pymysql
conn = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cur = conn.cursor()
for t in ['tasks','campaigns','learning_resources']:
    cur.execute(f'SELECT COUNT(*) FROM `{t}`')
    print(f'{t}: {cur.fetchone()[0]} rows')
cur.close()
conn.close()
