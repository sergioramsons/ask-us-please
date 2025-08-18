#!/bin/bash
# Simple Ubuntu 20.04 LTS Installer for Helpdesk Application
# Usage: wget https://raw.githubusercontent.com/your-repo/main/ubuntu-installer.sh && bash ubuntu-installer.sh

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

[[ -z "$DOMAIN_NAME" ]] && { echo "❌ Domain name required!"; exit 1; }

# Detect sudo requirement
SUDO=""; [[ ${EUID:-$(id -u)} -ne 0 ]] && SUDO="sudo"

echo "🚀 Installing helpdesk application for: $DOMAIN_NAME"
echo "📍 Target: Ubuntu 20.04 LTS"

# Update system and install prerequisites
echo "📦 Installing system packages..."
$SUDO apt-get update -qq
$SUDO apt-get install -y curl wget unzip nginx ufw certbot python3-certbot-nginx ca-certificates gnupg build-essential

# Install Node.js 18 (recommended for Ubuntu 20.04)
echo "🟢 Installing Node.js..."
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO bash -
    $SUDO apt-get install -y nodejs
fi

# Install PM2 globally
echo "⚙️  Installing PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
    $SUDO npm install -g pm2 --silent
fi

# Download and extract application
echo "⬇️  Downloading application..."
$SUDO mkdir -p "$APP_DIR"
cd /tmp
wget -q -O app.zip "$ZIP_URL"
unzip -q app.zip
folder=$(ls -d ask-us-please-* | head -1)
$SUDO cp -r "$folder"/* "$APP_DIR"/
$SUDO chown -R $(whoami):$(whoami) "$APP_DIR"
rm -rf app.zip "$folder"

# Setup application
echo "🔧 Setting up application..."
cd "$APP_DIR"
npm install --silent --no-audit --no-fund
npm run build

# Create server.cjs for production
cat > server.cjs <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Serve static files
app.use(express.static(distPath));

// Handle SPA routing
app.get('(.*)', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Helpdesk server running on port ${PORT}`);
});
EOF

# Install express dependency
npm install express --silent

# Configure PM2
echo "🔄 Configuring PM2..."
cat > ecosystem.config.cjs <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server.js',
    cwd: '$APP_DIR',
    env: {
      PORT: $APP_PORT,
      NODE_ENV: 'production'
    },
    error_file: '/var/log/helpdesk_error.log',
    out_file: '/var/log/helpdesk_out.log',
    log_file: '/var/log/helpdesk_combined.log'
  }]
}
EOF

# Start application with PM2
pm2 delete helpdesk 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME >/dev/null 2>&1 || true

# Configure Nginx
echo "🌐 Configuring Nginx..."
$SUDO tee /etc/nginx/sites-available/$DOMAIN_NAME >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Handle static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site and restart nginx
$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/$DOMAIN_NAME
$SUDO rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
$SUDO nginx -t && $SUDO systemctl reload nginx

# Configure firewall
echo "🔥 Configuring firewall..."
$SUDO ufw allow ssh >/dev/null 2>&1 || true
$SUDO ufw allow 'Nginx Full' >/dev/null 2>&1 || true
$SUDO ufw --force enable >/dev/null 2>&1 || true

# Final output
echo ""
echo "🎉 Installation completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Your helpdesk is now available at: http://$DOMAIN_NAME"
echo ""
echo "📋 Management commands:"
echo "  pm2 status               - Check application status"
echo "  pm2 logs helpdesk        - View application logs"
echo "  pm2 restart helpdesk     - Restart application"
echo "  pm2 stop helpdesk        - Stop application"
echo ""
echo "🔒 To enable SSL certificate (recommended):"
echo "  sudo certbot --nginx -d $DOMAIN_NAME"
echo ""
echo "📊 System info:"
echo "  App directory: $APP_DIR"
echo "  App port: $APP_PORT"
echo "  Log files: /var/log/helpdesk_*.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"