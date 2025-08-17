#!/usr/bin/env bash
# Offline/Zero-Git installer for Debian/Ubuntu
# Installs the app from a local folder, a local .zip, or a remote .zip URL
# Usage (env or args):
#   APP_SOURCE=/path/to/folder|/path/to/archive.zip|https://example.com/app.zip \
#   DOMAIN_NAME=helpdesk.example.com \
#   [APP_DIR=/opt/helpdesk] [APP_PORT=3000] [ADMIN_EMAIL=admin@example.com] [INSTALL_SSL=y] [GITHUB_TOKEN=]
#   bash scripts/install-from-source.sh
#
# Notes:
# - If APP_SOURCE is a private GitHub ZIP URL, set GITHUB_TOKEN so we can add the Authorization header
# - This script avoids git completely when APP_SOURCE is provided

set -euo pipefail

# Colors and logging
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log(){ echo -e "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
warn(){ echo -e "${YELLOW}[WARN] $*${NC}"; }
err(){ echo -e "${RED}[ERROR] $*${NC}"; exit 1; }

# Inputs
APP_SOURCE=${APP_SOURCE:-${1:-}}
DOMAIN_NAME=${DOMAIN_NAME:-${2:-}}
APP_DIR=${APP_DIR:-${3:-/opt/helpdesk}}
APP_PORT=${APP_PORT:-${4:-3000}}
ADMIN_EMAIL=${ADMIN_EMAIL:-${5:-}}
INSTALL_SSL=${INSTALL_SSL:-${6:-n}}
GITHUB_TOKEN=${GITHUB_TOKEN:-${7:-}}

[[ -z "${APP_SOURCE}" || -z "${DOMAIN_NAME}" ]] && {
  echo ""; echo "Usage:";
  echo "  APP_SOURCE=...</zip-or-folder> DOMAIN_NAME=... [APP_DIR=/opt/helpdesk] [APP_PORT=3000] [ADMIN_EMAIL=admin@example.com] [INSTALL_SSL=y] [GITHUB_TOKEN=xxxx] bash scripts/install-from-source.sh";
  echo ""; err "Missing required inputs: APP_SOURCE and DOMAIN_NAME";
}

# SUDO handling
SUDO=""; [[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

log "Starting zero-git install → source=$APP_SOURCE domain=$DOMAIN_NAME dir=$APP_DIR port=$APP_PORT"

log "Updating packages and installing prerequisites"
$SUDO apt-get update -y
$SUDO apt-get install -y curl wget unzip nginx ufw certbot python3-certbot-nginx ca-certificates gnupg build-essential

# Node.js 18 + PM2
if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js 18 (NodeSource)"
  if [ -n "$SUDO" ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO bash -
    $SUDO apt-get install -y nodejs
  else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
  fi
fi
if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2"
  $SUDO npm install -g pm2
fi

# Prepare app dir
$SUDO mkdir -p "$APP_DIR"
$SUDO chown -R "${USER:-$(id -un)}":"${USER:-$(id -un)}" "$APP_DIR"

# Acquire source into $APP_DIR
get_mime_type(){ file --brief --mime-type "$1" 2>/dev/null || echo ""; }

stage_dir=$(mktemp -d)
cleanup(){ rm -rf "$stage_dir" >/dev/null 2>&1 || true; }
trap cleanup EXIT

is_url=0; [[ "$APP_SOURCE" =~ ^https?:// ]] && is_url=1
if [ $is_url -eq 1 ]; then
  log "Downloading ZIP from URL"
  headers=(-L)
  if [ -n "$GITHUB_TOKEN" ]; then
    headers+=("-H" "Authorization: Bearer $GITHUB_TOKEN")
  fi
  curl -fS "${headers[@]}" -o "$stage_dir/app.zip" "$APP_SOURCE" || err "Failed to download ZIP from $APP_SOURCE"
  log "Extracting ZIP"
  unzip -q "$stage_dir/app.zip" -d "$stage_dir/extracted"
  # Find first directory level after unzip
  src_root=$(find "$stage_dir/extracted" -mindepth 1 -maxdepth 1 -type d -print -quit)
  if [ -z "$src_root" ]; then src_root="$stage_dir/extracted"; fi
  rsync -a --delete "$src_root"/ "$APP_DIR"/
elif [ -f "$APP_SOURCE" ]; then
  mime=$(get_mime_type "$APP_SOURCE")
  if [[ "$mime" == "application/zip" || "$APP_SOURCE" =~ \.zip$ ]]; then
    log "Extracting local ZIP"
    unzip -q "$APP_SOURCE" -d "$stage_dir/extracted"
    src_root=$(find "$stage_dir/extracted" -mindepth 1 -maxdepth 1 -type d -print -quit)
    if [ -z "$src_root" ]; then src_root="$stage_dir/extracted"; fi
    rsync -a --delete "$src_root"/ "$APP_DIR"/
  else
    err "Unsupported archive type: $mime. Provide a .zip or a folder path."
  fi
elif [ -d "$APP_SOURCE" ]; then
  log "Copying from local folder"
  rsync -a --delete "$APP_SOURCE"/ "$APP_DIR"/
else
  err "APP_SOURCE not found: $APP_SOURCE"
fi

cd "$APP_DIR"

# Install dependencies
log "Installing app dependencies"
npm install --no-audit --no-fund

# Build if available
if npm run | grep -q " build"; then
  log "Building app"
  npm run build || err "Build failed"
else
  warn "No build script found; skipping build"
fi

# Create minimal server.js if not present
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
pm2 start ecosystem.config.js || pm2 restart helpdesk || true
pm2 save
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

# Firewall
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
  warn "Skipping SSL (INSTALL_SSL=$INSTALL_SSL). Later: sudo certbot --nginx -d $DOMAIN_NAME -m you@example.com --agree-tos --non-interactive"
fi

log "Done!"
log "URLs: http://$DOMAIN_NAME  (use HTTPS if SSL enabled)"
log "Manage: pm2 status | pm2 logs helpdesk | pm2 restart helpdesk"
