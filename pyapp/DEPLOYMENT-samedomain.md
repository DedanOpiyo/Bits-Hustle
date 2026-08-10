# Same-Domain Deployment with Subdomain for Backend
# Frontend: https://bitshustlehubs.co.ke
# Backend API: https://api.bitshustlehubs.co.ke

## Files Created/Modified:
- nginx/same-domain.conf - nginx config for routing
- frontend/.env.production - updated with production API URL
- DEPLOYMENT.md - updated deployment instructions

## Nginx Configuration (nginx/same-domain.conf)

server {
    listen 80;
    server_name bitshustlehubs.co.ke www.bitshustlehubs.co.ke;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bitshustlehubs.co.ke www.bitshustlehubs.co.ke;

    # SSL certificates (use Let's Encrypt or your provider)
    ssl_certificate /etc/letsencrypt/live/bitshustlehubs.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bitshustlehubs.co.ke/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend static files
    root /var/www/bitshustlehubs.co.ke/frontend/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API subdomain
server {
    listen 80;
    server_name api.bitshustlehubs.co.ke;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.bitshustlehubs.co.ke;

    ssl_certificate /etc/letsencrypt/live/api.bitshustlehubs.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bitshustlehubs.co.ke/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Flask/Gunicorn
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}