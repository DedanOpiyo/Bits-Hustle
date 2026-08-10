import pymysql
import json
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

cursor.execute('SELECT id FROM campaigns LIMIT 1')
campaign_result = cursor.fetchone()
campaign_id = campaign_result[0] if campaign_result else None

print('Test data:')
print('  Ambassador ID: {}'.format(ambassador_id))
print('  Platform ID: {}'.format(platform_id))
print('  Campaign ID: {}'.format(campaign_id))

# Test lead creation via service
if ambassador_id and platform_id and campaign_id:
    from app.factory import create_app
    from app.services.lead_service import LeadService
    app = create_app()
    with app.app_context():
        from app.extensions import db
        try:
            lead_data = {
                'contactInfo': {
                    'name': 'Test Lead',
                    'email': 'test@example.com',
                    'phone': '1234567890'
                },
                'campaignId': campaign_id,
                'platformId': platform_id,
                'statusId': 'new'
            }
            lead = LeadService.create(db, lead_data, ambassador_id=ambassador_id)
            print('')
            print('SUCCESS: Lead created with platform_id')
            print('  Lead ID: {}'.format(lead.id))
            print('  Platform ID: {}'.format(lead.platform_id))
        except Exception as e:
            print('')
            print('ERROR: Failed to create lead: {}'.format(e))
else:
    print('Missing test data')

cursor.close()
connection.close()