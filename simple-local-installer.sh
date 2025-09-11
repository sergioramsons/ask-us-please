#!/bin/bash
# Simple local installer - no nginx, no domain required
# Usage: bash simple-local-installer.sh

set -euo pipefail

APP_DIR="/opt/helpdesk"
APP_PORT="${APP_PORT:-3000}"
ZIP_URL="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Don't run as root. Run as regular user with sudo access."
   exit 1
fi

SUDO=""
[[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

echo "🚀 Installing helpdesk application (Supabase mode - no SQLite compilation needed)..."

# Install prerequisites
echo "📦 Installing prerequisites..."
$SUDO apt-get update -qq
$SUDO apt-get install -qq -y curl wget unzip

# Install Node.js 18 if not present
if ! command -v node >/dev/null 2>&1 || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 18 ]]; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO bash -
    $SUDO apt-get install -y nodejs
fi

# Verify npm is available
if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm not found after Node.js installation"
    exit 1
fi

# Install PM2
if ! command -v pm2 >/dev/null 2>&1; then
    echo "📦 Installing PM2..."
    $SUDO npm install -g pm2
fi

# Create app directory
echo "📁 Setting up application directory..."
$SUDO mkdir -p "$APP_DIR"
$SUDO chown $(whoami):$(whoami) "$APP_DIR"

# Download and extract application
echo "⬇️ Downloading application..."
cd /tmp
rm -f app.zip
wget -q -O app.zip "$ZIP_URL"
unzip -q app.zip
folder=$(ls -d */ | head -1)
rm -rf "$APP_DIR"/*
cp -r "$folder"* "$APP_DIR"/
rm -rf app.zip "$folder"

# Install dependencies and build
echo "🔧 Installing dependencies (excluding SQLite packages)..."
cd "$APP_DIR"

# Remove SQLite-related dependencies to avoid compilation issues
echo "📝 Configuring for Supabase-only mode..."
npm pkg delete dependencies.better-sqlite3 dependencies.bcrypt --silent 2>/dev/null || true
npm pkg delete devDependencies."@types/better-sqlite3" devDependencies."@types/bcrypt" --silent 2>/dev/null || true

# Install remaining dependencies
npm install --silent --no-audit --no-fund

echo "🏗️ Building application..."
npm run build

# Create simple server
echo "🖥️ Creating server..."
cat > server.cjs <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Serve static files
app.use(express.static(distPath));

// Handle React Router routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Helpdesk server running on http://localhost:${PORT}`);
  console.log(`🌐 Access from other devices: http://YOUR_SERVER_IP:${PORT}`);
});
EOF

# Install express if not present
if ! npm list express >/dev/null 2>&1; then
    npm install express --silent
fi

# PM2 configuration
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server.cjs',
    cwd: '$APP_DIR',
    env: {
      PORT: $APP_PORT,
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork'
  }]
};
EOF

# Start with PM2
echo "🚀 Starting application..."
pm2 delete helpdesk 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME >/dev/null 2>&1 || true

# Test the application
echo "🧪 Testing application..."
sleep 3
if curl -sS -f http://localhost:$APP_PORT >/dev/null 2>&1; then
    echo "✅ Application is running successfully!"
else
    echo "⚠️ Application may not be responding yet. Check logs with: pm2 logs helpdesk"
fi

# Get server IP for external access
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📍 Local access: http://localhost:$APP_PORT"
echo "🌐 Network access: http://$SERVER_IP:$APP_PORT"
echo ""
echo "📊 Management commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs helpdesk   - View application logs"
echo "  pm2 restart helpdesk - Restart application"
echo "  pm2 stop helpdesk   - Stop application"
echo "  pm2 delete helpdesk - Remove application"
echo ""
echo "🔧 To allow external access, ensure port $APP_PORT is open:"
echo "  sudo ufw allow $APP_PORT"