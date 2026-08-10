# WSGI entry point for shared hosting with Passenger/mod_wsgi
import sys
import os

# Add application directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set production environment
os.environ['FLASK_ENV'] = 'production'
os.environ['FLASK_APP'] = 'wsgi.py'

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from app.factory import create_app

# Create Flask application instance
application = create_app()

# For Passenger compatibility
app = application

if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5000)