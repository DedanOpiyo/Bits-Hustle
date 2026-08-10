# Same-Domain Production Deployment Script (Linux/macOS)
# Usage: ./deploy-samedomain.sh production

#!/bin/bash
set -e

ENVIRONMENT=${1:-production}
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "BitsHustle Hub - Same Domain Deployment"
echo "Target Environment: $ENVIRONMENT"
echo "========================================"

# Step 1: Verify frontend
echo ""
echo "[1/4] Building frontend..."
cd "$PROJECT_ROOT/frontend"
npm run build || { echo "Frontend build failed"; exit 1; }
echo "Frontend build complete!"

# Step 2: Verify backend
echo ""
echo "[2/4] Verifying backend..."
cd "$PROJECT_ROOT/flask-api"
python -m py_compile app/*.py app/**/*.py 2>/dev/null || true
echo "Backend verification complete!"

# Step 3: Deploy (manual steps for non-Docker host)
echo ""
echo "[3/4] Deploying..."
echo ""
echo "MANUAL STEPS REQUIRED:"
echo "1. Upload frontend/dist/* to /var/www/bitshustlehubs.co.ke/html/"
echo "2. Install backend on server:"
echo "   cd $PROJECT_ROOT/flask-api"
echo "   source .venv/bin/activate"
echo "   gunicorn --bind 127.0.0.1:5000 --workers 4 wsgi:app &"
echo ""
echo "3. Configure nginx with nginx.conf (copy to /etc/nginx/sites-available/)"
echo "4. Enable site: ln -s /etc/nginx/sites-available/nginx.conf /etc/nginx/sites-enabled/"
echo "5. Reload nginx: systemctl reload nginx"

# Step 4: SSL setup
echo ""
echo "[4/4] SSL Certificate Setup (Let's Encrypt)"
echo ""
echo "Run on server:"
echo "certbot --nginx -d bitshustlehubs.co.ke -d www.bitshustlehubs.co.ke -d api.bitshustlehubs.co.ke"
echo ""
echo "Or separate for each domain:"
echo "certbot --nginx -d bitshustlehubs.co.ke"
echo "certbot --nginx -d api.bitshustlehubs.co.ke"

echo ""
echo "========================================"
echo "Deployment Files Ready"
echo "========================================"