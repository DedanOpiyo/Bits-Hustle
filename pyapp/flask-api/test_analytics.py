import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from app.factory import create_app
from app.extensions import db

app = create_app()
app.testing = True
client = app.test_client()

with app.app_context():
    try:
        from app.controllers.analytics import AnalyticsController
        result = AnalyticsController.platform_metrics(db)
        print('Success via direct call:', result)
    except Exception as e:
        print('Error in direct call:', str(e))
        import traceback
        traceback.print_exc()

    # Now test via the endpoint
    try:
        response = client.get('/api/analytics/platforms')
        print('Status code:', response.status_code)
        print('Response JSON:', response.get_json())
    except Exception as e:
        print('Error in test client:', str(e))
        import traceback
        traceback.print_exc()