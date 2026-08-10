# Production Deployment Checklist

## ✅ Pre-deployment Tasks

### 1. Environment Configuration
- [ ] Copy `flask-api/.env.production` to `.env` and fill in all secrets
- [ ] Generate strong `JWT_SECRET_KEY` (32+ random characters)
- [ ] Configure production database credentials
- [ ] Set correct `FRONTEND_URL` and production API URLs
- [ ] Configure SMTP credentials for email notifications
- [ ] Configure M-Pesa production credentials (not sandbox)
- [ ] Verify `MPESA_BASE_URL=https://api.safaricom.co.ke` (production endpoint)
- [ ] Set all `MPESA_*_URL` to your production domain

### 2. Security Hardening
- [ ] Remove `.env` from version control (add to `.gitignore`)
- [ ] Ensure all secrets use environment variables
- [ ] Configure HTTPS/SSL certificates
- [ ] Set `FLASK_ENV=production` in backend environment
- [ ] Set `DEBUG=False` in `ProdConfig` (already configured)

### 3. Database Preparation
- [ ] Create production database: `bitshustle`
- [ ] Run migrations: `flask --app wsgi.py db upgrade`
- [ ] Seed initial data if needed: `python seed.py`

### 4. Frontend Build
- [ ] Run `npm run typecheck` - fix any TypeScript errors
- [ ] Run `npm run lint` - fix any linting errors
- [ ] Run `npm run build` - verify production build succeeds

### 5. Docker Deployment (Recommended)
```bash
# From project root
cp flask-api/.env.production flask-api/.env
# Edit .env with production values
docker-compose -f docker-compose.prod.yml up -d
```

### 6. Manual Deployment (Alternative)
```bash
# Backend
cd flask-api
pip install -r requirements.txt gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 4 wsgi:app

# Frontend  
cd frontend
npm run build
# Serve /dist with nginx
```

## 🚀 Deployment Commands

### Full Docker Deployment
```powershell
# From D:\nzuki2025\bitshustle\pyapp
cp flask-api\.env.production flask-api\.env
# Edit flask-api\.env with production values
docker compose -f docker-compose.prod.yml up -d
```

### Backend Only (Manual)
```powershell
# From D:\nzuki2025\bitshustle\pyapp\flask-api
$env:FLASK_ENV="production"
flask --app wsgi.py db upgrade
gunicorn --bind 0.0.0.0:5000 --workers 4 --access-logfile - wsgi:app
```

### Frontend Build (Manual)
```powershell
# From D:\nzuki2025\bitshustle\pyapp\frontend
npm run typecheck
npm run lint
npm run build
```

## 🔍 Post-Deployment Verification
- [ ] Health check: `curl https://api.bitshustlehubs.co.ke/health`
- [ ] Verify CORS allows production frontend domain
- [ ] Test M-Pesa callbacks with production URLs
- [ ] Verify email sending works
- [ ] Check all API endpoints return proper responses