#!/bin/bash
# Simple deployment script for helpdesk application
# Usage: DOMAIN=your.domain.com bash deploy.sh

set -e

DOMAIN=${DOMAIN:-localhost}
APP_DIR="/opt/helpdesk"
PORT="3000"

echo "🚀 Deploying helpdesk application..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Don't run as root. Use: sudo bash deploy.sh"
   exit 1
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Create app directory
echo "📁 Setting up application directory..."
sudo mkdir -p "$APP_DIR"
sudo chown $USER:$USER "$APP_DIR"

# Download application
echo "⬇️ Downloading application..."
cd /tmp
wget -q -O app.zip "https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"
unzip -q app.zip
rm -rf "$APP_DIR"/*
cp -r ask-us-please-main/* "$APP_DIR"/
rm -rf app.zip ask-us-please-main

# Install dependencies and build
echo "🔧 Installing dependencies..."
cd "$APP_DIR"
npm install --silent
npm run build

# Create production server
echo "🖥️ Creating server..."
cat > server.js <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
EOF

# Install express
npm install express

# Setup PM2
echo "🔄 Setting up process manager..."
pm2 delete helpdesk 2>/dev/null || true
pm2 start server.js --name helpdesk
pm2 save
pm2 startup

echo ""
echo "🎉 Deployment complete!"
echo "🌐 Application running on: http://$DOMAIN:$PORT"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check status"
echo "  pm2 logs helpdesk   - View logs"
echo "  pm2 restart helpdesk - Restart app"
echo "  pm2 stop helpdesk   - Stop app"