# Shared Host Deployment Guide
# Main domain: bitshustlehubs.co.ke (frontend)
# Subdomain: api.bitshustlehubs.co.ke (Flask backend)

## Frontend Deployment (public_html/)

### 1. Build frontend
```bash
cd frontend
npm run build
```

### 2. Upload to shared host
Upload `frontend/dist/*` contents to `public_html/`

### 3. Create .htaccess (rename .htaccess.frontend → .htaccess)
```apache
# For SPA routing
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
<IfModule mod_headers.c>
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-XSS-Protection "1; mode=block"
</IfModule>
```

## Backend Deployment (api subdomain)

### Shared Host Requirements:
- Python 3.8+ support
- Passenger or mod_wsgi (cPanel often provides)
- MariaDB/MySQL database

### 1. Upload backend files
Upload `flask-api/app/` to `api/` directory (subdomain root)

### 2. Install dependencies
Create `pythonX.Y.cgi` script or use virtual environment if allowed:
```bash
cd ~/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Create .htaccess for API subdomain
```apache
# WSGI configuration (if using Passenger)
PassengerBaseEnvVar PATH /home/username/api/venv/bin
PassengerAppEnvVar FLASK_ENV production
PassengerAppEnvVar FLASK_APP wsgi.py

RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(.*)$ /wsgi.py/$1 [QSA,L]
```

### 4. Create WSGI entry point (wsgi.py in api/)
```python
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
os.environ['FLASK_ENV'] = 'production'
os.environ['FLASK_APP'] = 'wsgi.py'

from app.factory import create_app
application = create_app()

if __name__ == '__main__':
    application.run()
```

### 5. Environment file (.env in api/)
Set these variables via cPanel or `.env` file:
```
FLASK_ENV=production
DB_HOST=localhost
DB_NAME=bitshustle
DB_USER=username
DB_PASSWORD=password
JWT_SECRET_KEY=your-production-secret
FRONTEND_URL=https://bitshustlehubs.co.ke
```

## Alternative: Reverse Proxy to External API

If shared host doesn't support Python WSGI, deploy backend elsewhere and proxy via .htaccess:

```apache
# In main domain .htaccess - proxy /api to external server
RewriteEngine On
RewriteRule ^api/(.*)$ https://your-vps-server.com:5000/api/$1 [P,L]
RewriteRule ^api/(.*)$ http://127.0.0.1:5000/api/$1 [P,L]
```

## CORS Configuration

The backend in `flask-api/app/factory.py` already configures CORS for `FRONTEND_URL`:
```python
cors.init_app(app, resources={r"/api/*": {"origins": app.config.get("FRONTEND_URL", "*")}})
```

Set `FRONTEND_URL=https://bitshustlehubs.co.ke` in backend `.env`.

## Database Migration on Shared Host

If SSH access is available:
```bash
cd ~/api
source venv/bin/activate
flask db upgrade
```

Or manually apply migrations via phpMyAdmin using the SQL from migration files.