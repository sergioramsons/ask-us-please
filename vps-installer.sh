#!/bin/bash

# VPS Installer for Helpdesk with SQLite
# Usage: curl -sSL your-repo/vps-installer.sh | DOMAIN_NAME=your.domain bash

set -euo pipefail

# Configuration
DOMAIN_NAME=${DOMAIN_NAME:-}
APP_DIR="/opt/helpdesk"
APP_PORT="3000"
SQLITE_PORT="3001"
JWT_SECRET=$(openssl rand -base64 32)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Validate domain
if [[ -z "$DOMAIN_NAME" ]]; then
    error "DOMAIN_NAME is required"
    echo "Usage: curl -sSL url | DOMAIN_NAME=your.domain bash"
    exit 1
fi

# Allow root execution for VPS installations
if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
    warn "Running as root. Some commands will run without sudo."
fi

SUDO=""
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    SUDO="sudo"
fi

log "🚀 Installing helpdesk application with SQLite support..."

# Install prerequisites
log "📦 Installing prerequisites..."
$SUDO apt-get update -qq
$SUDO apt-get install -qq -y curl wget unzip nginx ufw certbot python3-certbot-nginx build-essential

# Install Node.js 18
if ! command -v node &> /dev/null; then
    log "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
    $SUDO apt-get install -y nodejs
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    log "📦 Installing PM2..."
    $SUDO npm install -g pm2
fi

# Create application directory
log "📁 Setting up application directory..."
$SUDO mkdir -p "$APP_DIR"
$SUDO chown $(whoami):$(whoami) "$APP_DIR"

# Download and extract application
log "📥 Downloading application..."
cd /tmp
wget -q -O app.zip "https://github.com/your-repo/helpdesk/archive/refs/heads/main.zip"
unzip -q app.zip
folder=$(ls -d */ | head -1)
cp -r "$folder"* "$APP_DIR"/
rm -rf app.zip "$folder"

# Setup application
cd "$APP_DIR"
log "🔧 Installing dependencies..."
npm install --silent

# Create environment file for SQLite mode
log "⚙️ Creating environment configuration..."
cat > .env <<EOF
# SQLite Configuration
USE_SQLITE=true
SQLITE_PORT=$SQLITE_PORT
JWT_SECRET=$JWT_SECRET
NODE_ENV=production

# Application Configuration
PORT=$APP_PORT
DOMAIN_NAME=$DOMAIN_NAME
EOF

# Build application with SQLite support
log "🏗️ Building application..."
npm run build

# Create SQLite server launcher
log "🗄️ Setting up SQLite server..."
cat > start-sqlite.js <<'EOF'
// Compile TypeScript to JavaScript for SQLite server
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Simple TypeScript compilation for server files
const tsFiles = [
  'src/lib/sqlite/database.ts',
  'src/lib/sqlite/auth.ts', 
  'src/lib/sqlite/models.ts',
  'src/lib/sqlite/server.ts'
];

console.log('Compiling SQLite server...');

// Copy and convert TypeScript files to JavaScript
tsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8')
      .replace(/import\s+.*?\s+from\s+['"]([^'"]*)['"]/g, "const $1 = require('$1')")
      .replace(/export\s+class\s+/g, 'class ')
      .replace(/export\s+interface\s+.*?\{[\s\S]*?\}/g, '')
      .replace(/export\s+\{[\s\S]*?\}/g, '')
      .replace(/export\s+default\s+/g, 'module.exports = ')
      .replace(/export\s+const\s+/g, 'const ')
      .replace(/export\s+function\s+/g, 'function ');
    
    const outputPath = file.replace('src/', 'dist/').replace('.ts', '.js');
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, content);
  }
});

console.log('Starting SQLite server...');
require('./server-sqlite.js');
EOF

# Create PM2 ecosystem configuration
log "🔄 Setting up PM2 configuration..."
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk-sqlite',
    script: 'start-sqlite.js',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT,
      USE_SQLITE: 'true',
      SQLITE_PORT: $SQLITE_PORT,
      JWT_SECRET: '$JWT_SECRET'
    },
    instances: 1,
    exec_mode: 'fork',
    log_file: '$APP_DIR/logs/combined.log',
    out_file: '$APP_DIR/logs/out.log',
    error_file: '$APP_DIR/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
}
EOF

# Create logs directory
mkdir -p logs

# Setup Nginx
log "🌐 Configuring Nginx..."
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO tee /etc/nginx/sites-available/$DOMAIN_NAME > /dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME _;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # SQLite API endpoint
    location /api/ {
        proxy_pass http://127.0.0.1:$SQLITE_PORT;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
EOF

$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/
$SUDO rm -f /etc/nginx/sites-enabled/default
$SUDO nginx -t && $SUDO systemctl reload nginx

# Configure firewall
log "🔒 Configuring firewall..."
$SUDO ufw allow ssh > /dev/null 2>&1 || true
$SUDO ufw allow 'Nginx Full' > /dev/null 2>&1 || true
$SUDO ufw --force enable > /dev/null 2>&1 || true

# Start application with PM2
log "🚀 Starting application..."
pm2 delete helpdesk-sqlite 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME > /dev/null 2>&1 || true

# Create update script
log "📝 Creating maintenance scripts..."
cat > update.sh <<EOF
#!/bin/bash
cd $APP_DIR
git pull origin main 2>/dev/null || echo "No git repository found"
npm install
npm run build
pm2 restart helpdesk-sqlite
echo "✅ Application updated successfully"
EOF

cat > status.sh <<EOF
#!/bin/bash
echo "📊 System Status"
echo "=================="
echo "🔄 PM2 Processes:"
pm2 list
echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "💾 Disk Usage:"
df -h $APP_DIR
echo ""
echo "📈 Memory Usage:"
free -h
echo ""
echo "🗄️ SQLite Database:"
ls -lh $APP_DIR/helpdesk.db 2>/dev/null || echo "Database will be created on first use"
EOF

chmod +x update.sh status.sh

log "✅ Installation completed successfully!"
echo ""
echo "🎉 Your helpdesk application is now running!"
echo "🌐 Access your application at: http://$DOMAIN_NAME"
echo ""
echo "📋 Useful commands:"
echo "  📊 Check status: cd $APP_DIR && ./status.sh"
echo "  🔄 Update app: cd $APP_DIR && ./update.sh"
echo "  📝 View logs: pm2 logs helpdesk-sqlite"
echo "  🔄 Restart: pm2 restart helpdesk-sqlite"
echo ""
echo "🔒 To enable SSL, run:"
echo "  sudo certbot --nginx -d $DOMAIN_NAME"
echo ""
echo "🗄️ Database location: $APP_DIR/helpdesk.db"
echo "🔑 JWT Secret: $JWT_SECRET (saved in .env file)"