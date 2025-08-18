#!/bin/bash
# One-liner helpdesk installer
# Usage: curl -sSL https://raw.githubusercontent.com/your-repo/main/one-liner-installer.sh | DOMAIN_NAME=your.domain bash

set -euo pipefail

DOMAIN_NAME=${DOMAIN_NAME:-}
APP_DIR="/opt/helpdesk"
APP_PORT="3000"
ZIP_URL="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"

[[ -z "$DOMAIN_NAME" ]] && { echo "Usage: curl -sSL url | DOMAIN_NAME=your.domain bash"; exit 1; }

SUDO=""; [[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

echo "🚀 Installing helpdesk application..."

# Install prerequisites
$SUDO apt-get update -qq
$SUDO apt-get install -qq -y curl wget unzip nginx ufw certbot python3-certbot-nginx nodejs npm

# Install PM2
$SUDO npm install -g pm2 --silent

# Download and extract
echo "📦 Downloading application..."
$SUDO mkdir -p "$APP_DIR" && cd /tmp
wget -q -O app.zip "$ZIP_URL"
unzip -q app.zip
folder=$(ls -d */ | head -1)
$SUDO cp -r "$folder"* "$APP_DIR"/
$SUDO chown -R $(whoami):$(whoami) "$APP_DIR"
rm -rf app.zip "$folder"

# Setup application
cd "$APP_DIR"
echo "🔧 Installing dependencies..."
npm install --silent --no-audit --no-fund
npm run build --silent 2>/dev/null || true

# Create fixed server.js
cat > server.js <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
EOF

npm install express --silent

# PM2 setup
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server.js',
    env: { PORT: $APP_PORT, NODE_ENV: 'production' }
  }]
}
EOF

pm2 delete helpdesk 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME >/dev/null 2>&1 || true

# Nginx setup
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

$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t && $SUDO systemctl reload nginx

# Firewall
$SUDO ufw allow ssh >/dev/null 2>&1 || true
$SUDO ufw allow 'Nginx Full' >/dev/null 2>&1 || true
$SUDO ufw --force enable >/dev/null 2>&1 || true

echo ""
echo "🎉 Installation complete!"
echo "🌐 Access: http://$DOMAIN_NAME"
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs helpdesk"
echo "🔒 SSL: sudo certbot --nginx -d $DOMAIN_NAME"