#!/bin/bash
# XAMPP Helpdesk Installer
# For VPS with existing XAMPP installation
set -euo pipefail

# Configuration
DOMAIN_NAME=${DOMAIN_NAME:-localhost}
APP_NAME="helpdesk"
XAMPP_ROOT="/opt/lampp"
HTDOCS_PATH="$XAMPP_ROOT/htdocs"
APP_DIR="$HTDOCS_PATH/$APP_NAME"
APP_PORT="3001"
ZIP_URL="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if XAMPP is installed
check_xampp() {
    log "Checking XAMPP installation..."
    if [[ ! -d "$XAMPP_ROOT" ]]; then
        error "XAMPP not found at $XAMPP_ROOT"
        error "Please install XAMPP first: https://www.apachefriends.org/download.html"
        exit 1
    fi
    
    if [[ ! -f "$XAMPP_ROOT/lampp" ]]; then
        error "XAMPP control script not found"
        exit 1
    fi
    
    log "✅ XAMPP found at $XAMPP_ROOT"
}

# Install Node.js if needed
install_nodejs() {
    if command -v node >/dev/null 2>&1 && [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -ge 18 ]]; then
        log "✅ Node.js $(node -v) is already installed"
        return
    fi
    
    log "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install PM2 globally
    sudo npm install -g pm2
    log "✅ Node.js and PM2 installed"
}

# Download and setup application
setup_application() {
    log "Setting up helpdesk application..."
    
    # Remove existing installation
    [[ -d "$APP_DIR" ]] && sudo rm -rf "$APP_DIR"
    
    # Create app directory
    sudo mkdir -p "$APP_DIR"
    cd /tmp
    
    # Download and extract
    log "📦 Downloading application..."
    wget -q -O app.zip "$ZIP_URL"
    unzip -q app.zip
    folder=$(ls -d */ | head -1)
    sudo cp -r "$folder"* "$APP_DIR"/
    sudo chown -R $(whoami):$(whoami) "$APP_DIR"
    rm -rf app.zip "$folder"
    
    cd "$APP_DIR"
    
    # Create .env file for XAMPP/MySQL setup
    log "📝 Creating configuration..."
    cat > .env <<EOF
# XAMPP MySQL Configuration
DATABASE_URL="mysql://root:@localhost:3306/helpdesk_db"
USE_SQLITE=false

# Application Configuration
NODE_ENV=production
PORT=$APP_PORT
JWT_SECRET=$(openssl rand -base64 32)

# XAMPP Paths
XAMPP_ROOT=$XAMPP_ROOT
UPLOADS_DIR=$APP_DIR/uploads
PUBLIC_URL=http://$DOMAIN_NAME/$APP_NAME
EOF

    # Install dependencies (excluding SQLite packages)
    log "🔧 Installing dependencies..."
    npm pkg delete dependencies.better-sqlite3 --silent 2>/dev/null || true
    npm pkg delete devDependencies."@types/better-sqlite3" --silent 2>/dev/null || true
    npm install --silent --no-audit --no-fund
    
    # Build application
    log "🏗️ Building application..."
    npm run build
    
    # Create uploads directory
    mkdir -p uploads
    sudo chown -R www-data:www-data uploads 2>/dev/null || true
}

# Setup MySQL database
setup_database() {
    log "Setting up MySQL database..."
    
    # Start XAMPP MySQL if not running
    sudo $XAMPP_ROOT/lampp startmysql >/dev/null 2>&1 || true
    
    # Create database
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS helpdesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || {
        warn "Could not create database automatically. Please create 'helpdesk_db' database manually in phpMyAdmin"
    }
    
    log "✅ Database setup complete"
}

# Create Express server for production
create_server() {
    log "Creating production server..."
    
    cat > server.js <<'EOF'
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// API routes would go here
app.use('/api', (req, res) => {
    res.json({ message: 'Helpdesk API - Connect to your database' });
});

// Serve React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Helpdesk server running on port ${PORT}`);
    console.log(`🌐 Access via: http://localhost:${PORT}`);
});
EOF

    # Install express and cors
    npm install express cors --save
}

# Setup PM2 configuration
setup_pm2() {
    log "Configuring PM2..."
    
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'server.js',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

    # Stop existing process if running
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start application
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup PM2 startup (optional)
    pm2 startup 2>/dev/null || warn "Could not setup PM2 startup. Run 'pm2 startup' manually if needed."
}

# Configure Apache virtual host
setup_apache() {
    log "Configuring Apache virtual host..."
    
    # Create Apache configuration
    sudo tee "$XAMPP_ROOT/apache2/conf/extra/httpd-helpdesk.conf" >/dev/null <<EOF
# Helpdesk Application Configuration
<VirtualHost *:80>
    ServerName $DOMAIN_NAME
    DocumentRoot $HTDOCS_PATH
    
    # Proxy API requests to Node.js
    ProxyPreserveHost On
    ProxyRequests Off
    
    # Enable required modules
    LoadModule proxy_module modules/mod_proxy.so
    LoadModule proxy_http_module modules/mod_proxy_http.so
    LoadModule rewrite_module modules/mod_rewrite.so
    
    # Proxy /api requests to Node.js server
    ProxyPass /api http://127.0.0.1:$APP_PORT/api
    ProxyPassReverse /api http://127.0.0.1:$APP_PORT/api
    
    # Serve static files from htdocs/helpdesk
    Alias /$APP_NAME "$APP_DIR/dist"
    <Directory "$APP_DIR/dist">
        AllowOverride All
        Require all granted
        
        # Handle React Router
        RewriteEngine On
        RewriteBase /$APP_NAME/
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /$APP_NAME/index.html [L]
    </Directory>
    
    # Handle uploads
    Alias /$APP_NAME/uploads "$APP_DIR/uploads"
    <Directory "$APP_DIR/uploads">
        AllowOverride None
        Require all granted
    </Directory>
    
    ErrorLog logs/helpdesk_error.log
    CustomLog logs/helpdesk_access.log common
</VirtualHost>
EOF

    # Include the configuration in main Apache config
    if ! grep -q "httpd-helpdesk.conf" "$XAMPP_ROOT/etc/httpd.conf"; then
        echo "Include conf/extra/httpd-helpdesk.conf" | sudo tee -a "$XAMPP_ROOT/etc/httpd.conf" >/dev/null
    fi
    
    # Restart Apache
    sudo $XAMPP_ROOT/lampp restart
    log "✅ Apache configured and restarted"
}

# Create management scripts
create_scripts() {
    log "Creating management scripts..."
    
    # Update script
    cat > update.sh <<EOF
#!/bin/bash
cd "$APP_DIR"
echo "🔄 Updating helpdesk application..."
git pull origin main 2>/dev/null || {
    echo "📦 Downloading latest version..."
    cd /tmp
    wget -q -O app.zip "$ZIP_URL"
    unzip -q -o app.zip
    folder=\$(ls -d */ | head -1)
    cp -r "\$folder"* "$APP_DIR"/
    rm -rf app.zip "\$folder"
    cd "$APP_DIR"
}
npm install --silent
npm run build
pm2 restart $APP_NAME
echo "✅ Update complete"
EOF

    # Status script
    cat > status.sh <<EOF
#!/bin/bash
echo "📊 Helpdesk Application Status"
echo "================================"
echo "🔧 PM2 Process:"
pm2 show $APP_NAME 2>/dev/null || echo "❌ Not running"
echo ""
echo "🌐 Access URLs:"
echo "   Main App: http://$DOMAIN_NAME/$APP_NAME"
echo "   API: http://$DOMAIN_NAME/api"
echo "   phpMyAdmin: http://$DOMAIN_NAME/phpmyadmin"
echo ""
echo "📝 Logs:"
echo "   App Logs: pm2 logs $APP_NAME"
echo "   Apache Logs: tail -f $XAMPP_ROOT/logs/helpdesk_error.log"
EOF

    chmod +x update.sh status.sh
}

# Main installation function
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║      XAMPP Helpdesk Installer         ║"
    echo "║   For VPS with existing XAMPP setup   ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_xampp
    install_nodejs
    setup_application
    setup_database
    create_server
    setup_pm2
    setup_apache
    create_scripts
    
    echo ""
    echo -e "${GREEN}🎉 Installation Complete!${NC}"
    echo "════════════════════════════════════════"
    echo "🌐 Access your helpdesk at:"
    echo "   http://$DOMAIN_NAME/$APP_NAME"
    echo ""
    echo "🛠️ Management Commands:"
    echo "   Status: ./status.sh"
    echo "   Update: ./update.sh"
    echo "   Logs: pm2 logs $APP_NAME"
    echo ""
    echo "📊 XAMPP Control:"
    echo "   Start: sudo $XAMPP_ROOT/lampp start"
    echo "   Stop: sudo $XAMPP_ROOT/lampp stop"
    echo "   Status: sudo $XAMPP_ROOT/lampp status"
    echo ""
    echo "💾 Database: http://$DOMAIN_NAME/phpmyadmin"
    echo "   Database: helpdesk_db"
    echo "   User: root (no password by default)"
}

# Error handling
trap 'error "Installation failed! Check the error above."; exit 1' ERR

# Run main function
main "$@"