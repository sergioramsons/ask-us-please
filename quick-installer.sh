#!/bin/bash
# Quick VPS installer for Helpdesk (stable, root-safe)
# Usage:
#   curl -sSL https://raw.githubusercontent.com/sergioramsons/ask-us-please/main/quick-installer.sh \
#     | DOMAIN_NAME=your.domain.com APP_DIR=/opt/helpdesk APP_PORT=3000 bash

set -euo pipefail

DOMAIN_NAME=${DOMAIN_NAME:-}
APP_DIR=${APP_DIR:-/opt/helpdesk}
APP_PORT=${APP_PORT:-3000}
ZIP_URL="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"

[[ -z "$DOMAIN_NAME" ]] && { echo "Usage: DOMAIN_NAME=your.domain bash quick-installer.sh"; exit 1; }

SUDO=""; [[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

log(){ echo -e "\033[0;32m[INFO]\033[0m $1"; }
warn(){ echo -e "\033[1;33m[WARN]\033[0m $1"; }
err(){ echo -e "\033[0;31m[ERROR]\033[0m $1"; }

log "Installing prerequisites..."
$SUDO apt-get update -qq
$SUDO apt-get install -qq -y curl wget unzip nginx ufw ca-certificates gnupg build-essential

# Node.js 18 + npm
need_node=true
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then need_node=false; fi
fi
if $need_node; then
  log "Installing Node.js 18 LTS..."
  $SUDO bash -c "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
  $SUDO apt-get install -y nodejs
fi
if ! command -v npm >/dev/null 2>&1; then
  warn "npm not found; installing..."
  $SUDO apt-get install -y npm || { err "Failed to install npm"; exit 1; }
fi
log "Node: $(node -v 2>/dev/null || echo not-installed), npm: $(npm -v 2>/dev/null || echo not-installed)"

# PM2
if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2..."
  if [[ ${EUID:-$(id -u)} -eq 0 ]]; then npm install -g pm2 --silent; else sudo npm install -g pm2 --silent; fi
fi

log "Downloading application..."
$SUDO mkdir -p "$APP_DIR"
$SUDO chown $(whoami):$(whoami) "$APP_DIR"
cd /tmp
rm -f app.zip || true
wget -q -O app.zip "$ZIP_URL"
unzip -q app.zip
src_folder=$(ls -d */ | head -1)
rm -rf "${APP_DIR:?}/"*
cp -a "$src_folder"/* "$APP_DIR"/
rm -rf app.zip "$src_folder"

log "Installing app dependencies..."
cd "$APP_DIR"
npm install --silent --no-audit --no-fund

log "Building app (non-fatal if fails)..."
npm run build --silent || warn "Build failed; serving any existing dist"

log "Creating production server..."
cat > server.cjs <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('(.*)', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
app.listen(PORT, '127.0.0.1', () => console.log(`✅ Helpdesk running on http://127.0.0.1:${PORT}`));
EOF

node -e "require.resolve('express')" 2>/dev/null || npm install express --silent

log "Configuring PM2..."
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server.cjs',
    cwd: '$APP_DIR',
    env: { PORT: $APP_PORT, NODE_ENV: 'production' },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

pm2 delete helpdesk 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME >/dev/null 2>&1 || true

log "Configuring Nginx..."
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
        proxy_read_timeout 60s;
        proxy_connect_timeout 30s;
    }
}
EOF

$SUDO rm -f /etc/nginx/sites-enabled/*
$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/$DOMAIN_NAME
$SUDO nginx -t && $SUDO systemctl reload nginx

log "Enabling firewall..."
$SUDO ufw allow ssh >/dev/null 2>&1 || true
$SUDO ufw allow 'Nginx Full' >/dev/null 2>&1 || true
$SUDO ufw --force enable >/dev/null 2>&1 || true

log "Verifying local app..."
set +e
curl -sS -I http://127.0.0.1:$APP_PORT | head -n1 || true
set -e

cat <<MSG

🎉 Done!
- Domain: http://$DOMAIN_NAME
- App dir: $APP_DIR
- PM2: pm2 status | pm2 logs helpdesk
- SSL (optional): sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMAIN_NAME
MSG
