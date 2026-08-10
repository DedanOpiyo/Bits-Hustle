import pymysql
import json
from app.factory import create_app
from app.services.payout_request_service import PayoutRequestService

connection = pymysql.connect(
    host='localhost',
    user='bitshustle_admin',
    password='MH1542k$ett',
    database='bitshustle'
)
cursor = connection.cursor()

# Get test data
cursor.execute('SELECT id FROM ambassadors LIMIT 1')
ambassador_result = cursor.fetchone()
ambassador_id = ambassador_result[0] if ambassador_result else None

cursor.execute('SELECT id FROM platform_types LIMIT 1')
platform_result = cursor.fetchone()
platform_id = platform_result[0] if platform_result else None

print('Test data:')
print('  Ambassador ID: {}'.format(ambassador_id))
print('  Platform ID: {}'.format(platform_id))

# Test payout creation via service
if ambassador_id and platform_id:
    app = create_app()
    with app.app_context():
        from app.extensions import db
        try:
            payout_data = {
                'amount': 1000.0,
                'method': 'bank_transfer',
                'details': 'Test payout with platform attribution',
                'platformId': platform_id
            }
            payout = PayoutRequestService.create(db, payout_data, ambassador_id=ambassador_id)
            print('')
            print('SUCCESS: Payout created with platform_id')
            print('  Payout ID: {}'.format(payout['id']))
            print('  Platform ID: {}'.format(payout.get('platform_id', 'None')))
        except Exception as e:
            print('')
            print('ERROR: Failed to create payout: {}'.format(e))
            import traceback
            traceback.print_exc()
else:
    print('Missing test data')

cursor.close()
connection.close()