import pymysql
import json
from app.factory import create_app
from app.services.referral_service import ReferralService

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

cursor.execute('SELECT id FROM users WHERE role_id != (SELECT id FROM role_types WHERE name = \"AMBASSADOR\") LIMIT 1')
# Get a non-ambassador user for referral
user_result = cursor.fetchone()
referred_user_id = user_result[0] if user_result else None

print('Test data:')
print('  Ambassador ID: {}'.format(ambassador_id))
print('  Platform ID: {}'.format(platform_id))
print('  Referred User ID: {}'.format(referred_user_id))

# Test referral creation via service
if ambassador_id and platform_id and referred_user_id:
    app = create_app()
    with app.app_context():
        from app.extensions import db
        try:
            referral_data = {
                'platformId': platform_id,
                'referredUserId': referred_user_id,
                'status': 'PENDING'
            }
            referral = ReferralService.create(db, referral_data, ambassador_id=ambassador_id)
            print('')
            print('SUCCESS: Referral created with platform_id')
            print('  Referral ID: {}'.format(referral['id']))
            print('  Platform ID: {}'.format(referral['platform_id']))
        except Exception as e:
            print('')
            print('ERROR: Failed to create referral: {}'.format(e))
            import traceback
            traceback.print_exc()
else:
    print('Missing test data')

cursor.close()
connection.close()