from app.factory import create_app

app = create_app()

with app.test_client() as c:
    endpoints = [
        '/fraud-policy',
        '/inactivity-policy',
        '/referral-policy',
        '/hub-fee-policy',
        '/partner-campaign-approval-policy',
        '/health',
        '/api'
    ]
    print('Running test_client smoke tests...')
    for e in endpoints:
        r = c.get(e)
        print('\nEndpoint:', e, 'STATUS', r.status_code)
        data = r.get_data(as_text=True)
        print(data[:400].replace('\n',' ')[:400])
    print('\nDone')
