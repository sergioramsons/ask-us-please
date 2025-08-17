#!/usr/bin/env bash
# Simple, non-interactive installer (root-safe) for Debian 12
# Usage (env or args):
#   GITHUB_REPO=... DOMAIN_NAME=... [APP_DIR=/opt/helpdesk] [APP_PORT=3000] [ADMIN_EMAIL=admin@example.com] [INSTALL_SSL=y]
#   bash simple-installer-root.sh
# OR
#   bash simple-installer-root.sh https://github.com/OWNER/REPO.git helpdesk.example.com /opt/helpdesk 3000 admin@example.com y

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log(){ echo -e "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
warn(){ echo -e "${YELLOW}[WARN] $*${NC}"; }
err(){ echo -e "${RED}[ERROR] $*${NC}"; exit 1; }

# Inputs (env overrides > args > defaults)
GITHUB_REPO=${GITHUB_REPO:-${1:-}}
DOMAIN_NAME=${DOMAIN_NAME:-${2:-}}
APP_DIR=${APP_DIR:-${3:-/opt/helpdesk}}
APP_PORT=${APP_PORT:-${4:-3000}}
ADMIN_EMAIL=${ADMIN_EMAIL:-${5:-}}
INSTALL_SSL=${INSTALL_SSL:-${6:-n}}

[[ -z "$GITHUB_REPO" || -z "$DOMAIN_NAME" ]] && {
  echo "";
  echo "Usage:";
  echo "  GITHUB_REPO=... DOMAIN_NAME=... [APP_DIR=/opt/helpdesk] [APP_PORT=3000] [ADMIN_EMAIL=admin@example.com] [INSTALL_SSL=y] bash simple-installer-root.sh";
  echo "  bash simple-installer-root.sh https://github.com/OWNER/REPO.git helpdesk.example.com /opt/helpdesk 3000 admin@example.com y";
  echo ""; err "Missing required inputs: GITHUB_REPO and DOMAIN_NAME";
}

# SUDO handling (works as root or sudo user)
SUDO=""; [[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

log "Starting install → repo=$GITHUB_REPO domain=$DOMAIN_NAME dir=$APP_DIR port=$APP_PORT"

log "Updating packages and installing prerequisites"
$SUDO apt-get update -y
$SUDO apt-get install -y curl wget git nginx ufw certbot python3-certbot-nginx ca-certificates gnupg build-essential

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js 18 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2"
  $SUDO npm install -g pm2
fi

log "Cloning/updating repository"
$SUDO mkdir -p "$APP_DIR"
$SUDO chown -R "${USER:-$(id -un)}":"${USER:-$(id -un)}" "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$GITHUB_REPO" "$APP_DIR"
fi

cd "$APP_DIR"

log "Installing app dependencies"
npm install --no-audit --no-fund

# Build (if package.json has a build script). Ignore failure if none.
if npm run | grep -q " build"; then
  log "Building app"
  npm run build || err "Build failed"
else
  warn "No build script found; skipping build"
fi

# Minimal Node static server (Express) serving ./dist
if [ ! -f server.js ]; then
  log "Creating simple static server (Express)"
  cat > server.js <<'JS'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
JS
  npm install express --silent
fi

# PM2 setup
log "Configuring PM2"
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
# Ensure PM2 starts on boot for current user
pm2 startup systemd -u "${USER:-$(id -un)}" --hp "$HOME" >/dev/null 2>&1 || true

# Nginx reverse proxy
log "Configuring Nginx for $DOMAIN_NAME → 127.0.0.1:$APP_PORT"
$SUDO tee /etc/nginx/sites-available/$DOMAIN_NAME >/dev/null <<NGINX
server {
  listen 80;
  server_name $DOMAIN_NAME;
  location / {
    proxy_pass http://127.0.0.1:$APP_PORT;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX
$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/$DOMAIN_NAME
$SUDO nginx -t
$SUDO systemctl reload nginx

# Firewall (optional but safe)
if command -v ufw >/dev/null 2>&1; then
  log "Setting UFW (allow SSH + Nginx Full)"
  $SUDO ufw allow ssh || true
  $SUDO ufw allow 'Nginx Full' || true
  $SUDO ufw --force enable || true
fi

# SSL (optional)
if [[ "$INSTALL_SSL" =~ ^[Yy]$ ]]; then
  if [[ -z "$ADMIN_EMAIL" ]]; then
    warn "INSTALL_SSL=y but ADMIN_EMAIL missing; skipping SSL"
  else
    log "Obtaining SSL with certbot"
    $SUDO certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$ADMIN_EMAIL" || warn "Certbot failed; check DNS and try again"
  fi
else
  warn "Skipping SSL (INSTALL_SSL=$INSTALL_SSL). You can later run: sudo certbot --nginx -d $DOMAIN_NAME -m you@example.com --agree-tos --non-interactive"
fi

log "Done!"
log "URLs: http://$DOMAIN_NAME  (use HTTPS if SSL enabled)"
log "Manage: pm2 status | pm2 logs helpdesk | pm2 restart helpdesk"
