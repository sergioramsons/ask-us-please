#!/bin/bash
# XAMPP VPS Installer - Robust solution for XAMPP environments
# Usage: bash xampp-vps-installer.sh [domain] or bash xampp-vps-installer.sh

set -euo pipefail

# Configuration
DOMAIN=${1:-localhost}
APP_DIR="/opt/lampp/htdocs/helpdesk"
BACKUP_DIR="/opt/lampp/htdocs/helpdesk-backup-$(date +%Y%m%d-%H%M%S)"
ZIP_URL="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"
LOG_FILE="/tmp/helpdesk-install.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if XAMPP is installed
check_xampp() {
    if [ ! -d "/opt/lampp" ]; then
        error "XAMPP not found! Please install XAMPP first."
        echo "Download from: https://www.apachefriends.org/download.html"
        exit 1
    fi
    log "XAMPP installation detected"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Don't run as root for security reasons"
        echo "Create a user: sudo adduser helpdesk && sudo usermod -aG sudo helpdesk"
        exit 1
    fi
}

# Install prerequisites
install_prerequisites() {
    log "Installing prerequisites..."
    
    # Update system
    sudo apt-get update -qq
    
    # Install essential packages
    sudo apt-get install -qq -y \
        curl \
        wget \
        unzip \
        build-essential \
        python3-dev \
        ca-certificates \
        gnupg \
        lsb-release

    # Install Node.js 18 if not present
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | sed 's/v//') -lt 18 ]]; then
        log "Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install PM2 for process management
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    log "Prerequisites installed successfully"
}

# Backup existing installation
backup_existing() {
    if [ -d "$APP_DIR" ]; then
        warning "Existing installation found. Creating backup..."
        sudo mkdir -p "$(dirname "$BACKUP_DIR")"
        sudo cp -r "$APP_DIR" "$BACKUP_DIR"
        log "Backup created at: $BACKUP_DIR"
    fi
}

# Download and setup application
setup_application() {
    log "Setting up application..."
    
    # Create app directory
    sudo mkdir -p "$APP_DIR"
    cd /tmp
    
    # Download application
    log "Downloading application from GitHub..."
    wget -q --show-progress -O helpdesk.zip "$ZIP_URL"
    
    # Extract application
    log "Extracting application..."
    unzip -q helpdesk.zip
    EXTRACTED_DIR=$(ls -d ask-us-please-*/ | head -1)
    
    # Copy files to XAMPP directory
    sudo cp -r "${EXTRACTED_DIR}"* "$APP_DIR/"
    sudo chown -R www-data:www-data "$APP_DIR"
    sudo chmod -R 755 "$APP_DIR"
    
    # Cleanup
    rm -rf helpdesk.zip "$EXTRACTED_DIR"
    
    log "Application files copied to $APP_DIR"
}

# Configure package.json for VPS environment
configure_package() {
    log "Configuring package.json for VPS environment..."
    
    cd "$APP_DIR"
    
    # Remove problematic dependencies that cause compilation issues
    sudo -u www-data npm pkg delete dependencies.better-sqlite3
    sudo -u www-data npm pkg delete dependencies.bcrypt
    sudo -u www-data npm pkg delete dependencies.jsonwebtoken
    sudo -u www-data npm pkg delete dependencies.cors
    sudo -u www-data npm pkg delete dependencies.express
    
    # Add express for server
    sudo -u www-data npm pkg set dependencies.express="^4.18.2"
    
    log "Package.json configured for Supabase-only mode"
}

# Install dependencies and build
install_and_build() {
    log "Installing dependencies..."
    cd "$APP_DIR"
    
    # Set npm cache and tmp directories
    export npm_config_cache="/tmp/.npm"
    export npm_config_tmp="/tmp"
    
    # Install dependencies with specific flags
    sudo -u www-data npm install \
        --no-audit \
        --no-fund \
        --prefer-offline \
        --no-optional 2>&1 | tee -a "$LOG_FILE"
    
    # Build application
    log "Building application..."
    sudo -u www-data npm run build 2>&1 | tee -a "$LOG_FILE"
    
    log "Dependencies installed and application built"
}

# Create production server
create_server() {
    log "Creating production server..."
    
    cd "$APP_DIR"
    
    # Create server.js for production
    sudo -u www-data tee server.js > /dev/null << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

// Configuration
const PORT = process.env.PORT || 3001;
const DIST_PATH = path.join(__dirname, 'dist');

// Middleware
app.use(express.static(DIST_PATH, {
    maxAge: '1d',
    etag: false
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// Start server
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ Helpdesk server running on http://127.0.0.1:${PORT}`);
    console.log(`📁 Serving from: ${DIST_PATH}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
EOF

    log "Production server created"
}

# Setup PM2 process management
setup_pm2() {
    log "Setting up PM2 process management..."
    
    cd "$APP_DIR"
    
    # Create PM2 ecosystem file
    sudo -u www-data tee ecosystem.config.js > /dev/null << EOF
module.exports = {
    apps: [{
        name: 'helpdesk',
        script: 'server.js',
        cwd: '$APP_DIR',
        instances: 1,
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3001
        },
        error_file: '/tmp/helpdesk-error.log',
        out_file: '/tmp/helpdesk-out.log',
        log_file: '/tmp/helpdesk-combined.log',
        time: true,
        max_restarts: 10,
        min_uptime: '10s',
        max_memory_restart: '500M'
    }]
};
EOF

    # Stop existing process if running
    pm2 delete helpdesk 2>/dev/null || true
    
    # Start with PM2
    cd "$APP_DIR"
    sudo -u www-data pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    sudo -u www-data pm2 save
    
    # Setup startup script
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u www-data --hp /var/www
    
    log "PM2 configured successfully"
}

# Configure Apache
configure_apache() {
    log "Configuring Apache for helpdesk..."
    
    # Create Apache configuration
    sudo tee /opt/lampp/etc/extra/helpdesk.conf > /dev/null << EOF
# Helpdesk Application Configuration
<Location /helpdesk>
    ProxyPass http://127.0.0.1:3001/
    ProxyPassReverse http://127.0.0.1:3001/
    ProxyPreserveHost On
    
    # Headers for better proxy handling
    ProxyAddHeaders On
    RequestHeader set X-Forwarded-Proto "http"
    RequestHeader set X-Forwarded-Port "80"
</Location>

# Enable mod_proxy and mod_proxy_http if not already enabled
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule headers_module modules/mod_headers.so
EOF

    # Include in main Apache config
    if ! grep -q "Include etc/extra/helpdesk.conf" /opt/lampp/etc/httpd.conf; then
        echo "Include etc/extra/helpdesk.conf" | sudo tee -a /opt/lampp/etc/httpd.conf
    fi
    
    # Restart Apache
    sudo /opt/lampp/lampp restart
    
    log "Apache configured successfully"
}

# Create management scripts
create_management_scripts() {
    log "Creating management scripts..."
    
    # Create start script
    sudo tee /usr/local/bin/helpdesk-start > /dev/null << 'EOF'
#!/bin/bash
echo "🚀 Starting helpdesk application..."
cd /opt/lampp/htdocs/helpdesk
sudo -u www-data pm2 start ecosystem.config.js 2>/dev/null || sudo -u www-data pm2 restart helpdesk
sudo /opt/lampp/lampp start
echo "✅ Helpdesk started successfully"
EOF

    # Create stop script
    sudo tee /usr/local/bin/helpdesk-stop > /dev/null << 'EOF'
#!/bin/bash
echo "🛑 Stopping helpdesk application..."
sudo -u www-data pm2 stop helpdesk 2>/dev/null || true
sudo /opt/lampp/lampp stop
echo "✅ Helpdesk stopped successfully"
EOF

    # Create status script
    sudo tee /usr/local/bin/helpdesk-status > /dev/null << 'EOF'
#!/bin/bash
echo "📊 Helpdesk Application Status"
echo "================================"
echo "PM2 Status:"
sudo -u www-data pm2 status helpdesk 2>/dev/null || echo "PM2 process not running"
echo ""
echo "XAMPP Status:"
sudo /opt/lampp/lampp status
echo ""
echo "Application Health:"
curl -s http://127.0.0.1:3001/health 2>/dev/null || echo "Application not responding"
EOF

    # Make scripts executable
    sudo chmod +x /usr/local/bin/helpdesk-*
    
    log "Management scripts created: helpdesk-start, helpdesk-stop, helpdesk-status"
}

# Test installation
test_installation() {
    log "Testing installation..."
    
    # Wait for application to start
    sleep 5
    
    # Test local application
    if curl -s -f http://127.0.0.1:3001/health > /dev/null; then
        log "✅ Application is responding locally"
    else
        error "❌ Application is not responding locally"
        return 1
    fi
    
    # Test through Apache
    if curl -s -f "http://localhost/helpdesk" > /dev/null; then
        log "✅ Application accessible through Apache"
    else
        warning "⚠️  Application not accessible through Apache (check Apache config)"
    fi
    
    return 0
}

# Main installation function
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════╗"
    echo "║     XAMPP Helpdesk Installer          ║"
    echo "║     Robust VPS Installation           ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
    
    log "Starting installation for domain: $DOMAIN"
    log "Installation log: $LOG_FILE"
    
    # Execute installation steps
    check_root
    check_xampp
    install_prerequisites
    backup_existing
    setup_application
    configure_package
    install_and_build
    create_server
    setup_pm2
    configure_apache
    create_management_scripts
    
    # Test installation
    if test_installation; then
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════╗"
        echo "║         ✅ INSTALLATION COMPLETE      ║"
        echo "╚═══════════════════════════════════════╝${NC}"
        echo ""
        echo "🌐 Access your helpdesk at:"
        echo "   • Local: http://localhost/helpdesk"
        echo "   • Domain: http://$DOMAIN/helpdesk"
        echo ""
        echo "🛠️  Management commands:"
        echo "   • Start:  helpdesk-start"
        echo "   • Stop:   helpdesk-stop"  
        echo "   • Status: helpdesk-status"
        echo ""
        echo "📋 Useful commands:"
        echo "   • View logs: sudo -u www-data pm2 logs helpdesk"
        echo "   • Restart:   sudo -u www-data pm2 restart helpdesk"
        echo "   • Monitor:   sudo -u www-data pm2 monit"
        echo ""
        echo "📁 Installation directory: $APP_DIR"
        echo "📄 Installation log: $LOG_FILE"
        
        if [ "$DOMAIN" != "localhost" ]; then
            echo ""
            echo "🔒 To enable SSL (recommended):"
            echo "   sudo certbot --apache -d $DOMAIN"
        fi
    else
        error "Installation completed with errors. Check logs: $LOG_FILE"
        exit 1
    fi
}

# Run main function
main "$@"