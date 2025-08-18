#!/bin/bash
# Helpdesk Simple Installer
# Usage: wget https://your-domain.com/install.sh && bash install.sh

set -euo pipefail

# Configuration
DOMAIN_NAME=${1:-}
APP_DIR="/opt/helpdesk"
APP_PORT="3000"
ZIP_URL="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"

# Get domain name if not provided
if [[ -z "$DOMAIN_NAME" ]]; then
    echo "Enter your domain name (e.g., helpdesk.yourcompany.com):"
    read -r DOMAIN_NAME
fi

[[ -z "$DOMAIN_NAME" ]] && { echo "Domain name required!"; exit 1; }

SUDO=""; [[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

echo "🚀 Installing helpdesk for domain: $DOMAIN_NAME"

# Install packages
echo "📦 Installing prerequisites..."
$SUDO apt-get update -qq
$SUDO apt-get install -y curl wget unzip nginx ufw certbot python3-certbot-nginx nodejs npm >/dev/null 2>&1

# Install PM2
if ! command -v pm2 >/dev/null 2>&1; then
    $SUDO npm install -g pm2 --silent
fi

# Download app
echo "⬇️  Downloading application..."
$SUDO mkdir -p "$APP_DIR"
cd /tmp
wget -q -O app.zip "$ZIP_URL"
unzip -q app.zip
folder=$(ls -d */ | head -1)
$SUDO cp -r "$folder"* "$APP_DIR"/
$SUDO chown -R $(whoami):$(whoami) "$APP_DIR"
rm -rf app.zip "$folder"

# Build app
echo "🔨 Building application..."
cd "$APP_DIR"
npm install --silent --no-audit --no-fund
npm run build --silent 2>/dev/null || true

# Start with PM2
echo "🚀 Starting application..."
pm2 delete helpdesk >/dev/null 2>&1 || true
pm2 serve dist $APP_PORT --spa --name helpdesk
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME >/dev/null 2>&1 || true

# Configure Nginx
echo "🌐 Configuring web server..."
$SUDO tee /etc/nginx/sites-available/$DOMAIN_NAME >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/$DOMAIN_NAME
$SUDO rm -f /etc/nginx/sites-enabled/default >/dev/null 2>&1 || true
$SUDO nginx -t && $SUDO systemctl reload nginx

# Configure firewall
echo "🔥 Configuring firewall..."
$SUDO ufw allow ssh >/dev/null 2>&1 || true
$SUDO ufw allow 'Nginx Full' >/dev/null 2>&1 || true
$SUDO ufw --force enable >/dev/null 2>&1 || true

echo ""
echo "✅ Installation completed successfully!"
echo "🌐 Your helpdesk is available at: http://$DOMAIN_NAME"
echo ""
echo "📋 Management commands:"
echo "  pm2 status          - Check status"
echo "  pm2 logs helpdesk   - View logs"
echo "  pm2 restart helpdesk - Restart app"
echo ""
echo "🔒 To setup SSL certificate:"
echo "  sudo certbot --nginx -d $DOMAIN_NAME"
echo ""