# WSGI entry point for shared hosting with Passenger/mod_wsgi
# Python 3.11 compatible
# Place this file in the subdomain root (api.bitshustlehubs.co.ke/)
# Alongside app/ directory and .env file

import sys
import os
from pathlib import Path

# Get the directory containing wsgi_sharedhost.py
APP_DIR = Path(__file__).parent.resolve()

# Add application directory to path for 'app' module import
sys.path.insert(0, str(APP_DIR))

# Set production environment
os.environ['FLASK_ENV'] = 'production'

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv(APP_DIR / '.env')
except ImportError:
    pass

# Import and create Flask application
from app.factory import create_app

# WSGI callable (required by shared hosting)
application = create_app()
app = application

if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5000)