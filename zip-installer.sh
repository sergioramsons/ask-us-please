#!/bin/bash
# Simple zip installer for helpdesk application
# Usage: DOMAIN_NAME=your.domain ZIP_URL=https://your-zip-url bash zip-installer.sh

set -euo pipefail

DOMAIN_NAME=${DOMAIN_NAME:-}
ZIP_URL=${ZIP_URL:-"https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"}
APP_DIR="/opt/helpdesk"
APP_PORT="3000"

[[ -z "$DOMAIN_NAME" ]] && {
  echo "Usage: DOMAIN_NAME=your.domain bash zip-installer.sh"
  echo "Optional: ZIP_URL=https://your-zip-url (defaults to GitHub main branch)"
  exit 1
}

SUDO=""; [[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

echo "Installing prerequisites..."
$SUDO apt-get update -y
$SUDO apt-get install -y curl wget unzip nginx ufw certbot python3-certbot-nginx ca-certificates gnupg build-essential

# Install Node.js 18
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
fi

# Install PM2
if ! command -v pm2 >/dev/null 2>&1; then
  $SUDO npm install -g pm2
fi

echo "Downloading application from: $ZIP_URL"
$SUDO mkdir -p "$APP_DIR"
cd /tmp
wget -O app.zip "$ZIP_URL"

echo "Extracting and installing..."
unzip -q app.zip
folder=$(ls -d */ | head -1)
$SUDO cp -r "$folder"* "$APP_DIR"/
$SUDO chown -R $(whoami):$(whoami) "$APP_DIR"
rm -rf app.zip "$folder"

cd "$APP_DIR"
npm install --no-audit --no-fund

# Build if script exists
if npm run | grep -q " build"; then
  npm run build
fi

# Create server.js with correct routing
cat > server.js <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath, { index: false }));
app.get(/(.*)/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
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

pm2 start ecosystem.config.js || pm2 restart helpdesk
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
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Port \$server_port;
  }
}
EOF

$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/$DOMAIN_NAME
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t && $SUDO systemctl reload nginx

# Firewall
$SUDO ufw allow ssh || true
$SUDO ufw allow 'Nginx Full' || true
$SUDO ufw --force enable || true

echo "✅ Installation complete!"
echo "🌐 Access your helpdesk at: http://$DOMAIN_NAME"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status              - Check application status"
echo "  pm2 logs helpdesk       - View application logs"
echo "  pm2 restart helpdesk    - Restart application"
echo "  pm2 stop helpdesk       - Stop application"
echo ""
echo "🔒 To setup SSL certificate, run:"
echo "  sudo certbot --nginx -d $DOMAIN_NAME"