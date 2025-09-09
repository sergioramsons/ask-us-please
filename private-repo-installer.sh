#!/bin/bash
# Private repo installer - no git required
# Usage: GITHUB_TOKEN=ghp_xxx DOMAIN_NAME=your.domain bash private-repo-installer.sh

set -euo pipefail

GITHUB_TOKEN=${GITHUB_TOKEN:-}
DOMAIN_NAME=${DOMAIN_NAME:-}
APP_DIR="/opt/helpdesk"
APP_PORT="3000"

[[ -z "$GITHUB_TOKEN" || -z "$DOMAIN_NAME" ]] && {
  echo "Usage: GITHUB_TOKEN=ghp_xxx DOMAIN_NAME=your.domain bash private-repo-installer.sh"
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

echo "Downloading private repo..."
$SUDO mkdir -p "$APP_DIR"
cd /tmp
curl -L -H "Authorization: Bearer $GITHUB_TOKEN" \
  -o repo.zip \
  "https://api.github.com/repos/sergioramsons/ask-us-please/zipball/main"

echo "Extracting and installing..."
unzip -q repo.zip
folder=$(ls -d */ | head -1)
$SUDO cp -r "$folder"* "$APP_DIR"/
$SUDO chown -R $(whoami):$(whoami) "$APP_DIR"
rm -rf repo.zip "$folder"

cd "$APP_DIR"
npm install --no-audit --no-fund

# Build if script exists
if npm run | grep -q " build"; then
  npm run build
fi

# Create server.cjs if needed
if [ ! -f server.cjs ]; then
  cat > server.cjs <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('(.*)', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
EOF
  npm install express --silent
fi

# PM2 setup
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server.cjs',
    cwd: '$APP_DIR',
    env: { PORT: $APP_PORT, NODE_ENV: 'production' }
  }]
}
EOF

pm2 start ecosystem.config.cjs || pm2 restart helpdesk
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME >/dev/null 2>&1 || true

# Nginx setup
$SUDO tee /etc/nginx/sites-available/$DOMAIN_NAME >/dev/null <<EOF
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name $DOMAIN_NAME www.$DOMAIN_NAME _;
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
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t && $SUDO systemctl reload nginx

# Firewall
$SUDO ufw allow ssh || true
$SUDO ufw allow 'Nginx Full' || true
$SUDO ufw --force enable || true

echo "Done! Access: http://$DOMAIN_NAME"
echo "Commands: pm2 status | pm2 logs helpdesk | pm2 restart helpdesk"