import urllib.request, time, sys

urls=[
 'http://127.0.0.1:5001/fraud-policy',
 'http://127.0.0.1:5001/inactivity-policy',
 'http://127.0.0.1:5001/referral-policy',
 'http://127.0.0.1:5001/hub-fee-policy',
 'http://127.0.0.1:5001/partner-campaign-approval-policy',
 'http://127.0.0.1:5001/health',
 'http://127.0.0.1:5001/api'
]

print('Starting smoke tests...')
for u in urls:
    ok=False
    for i in range(20):
        try:
            r=urllib.request.urlopen(u, timeout=5)
            body=r.read(300)
            print('\nURL:',u,'STATUS',r.getcode())
            print(body.decode('utf-8','ignore')[:500].replace('\n',' ').strip())
            ok=True
            break
        except Exception as e:
            time.sleep(0.3)
    if not ok:
        print('\nURL:',u,'FAILED')

print('\nSmoke tests completed.')
