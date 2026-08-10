import sys
import os
from pathlib import Path

APP_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(APP_DIR))

os.environ['FLASK_ENV'] = 'production'

try:
    from dotenv import load_dotenv
    load_dotenv(APP_DIR / '.env')
except ImportError:
    pass

from app.factory import create_app
application = create_app()
app = application