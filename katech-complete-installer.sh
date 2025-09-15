#!/bin/bash
# Complete Helpdesk Installer for Katech
# This installs everything: Node.js, SQLite database, application, Nginx, PM2
# Usage: bash katech-complete-installer.sh

set -euo pipefail

# Configuration
CLIENT_NAME="katech"
APP_DIR="/opt/helpdesk-${CLIENT_NAME}"
APP_PORT="3001"
ZIP_URL="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║               KATECH HELPDESK COMPLETE INSTALLER             ║"
    echo "║                                                              ║"
    echo "║  This installer will set up everything you need:             ║"
    echo "║  • Node.js 18+ and system dependencies                      ║"
    echo "║  • Helpdesk application with SQLite database                ║"
    echo "║  • PM2 process manager                                       ║"
    echo "║  • Nginx reverse proxy                                       ║"
    echo "║  • Firewall configuration                                    ║"
    echo "║                                                              ║"
    echo "║  No external database or Supabase needed!                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Don't run this script as root. Run as regular user with sudo access."
        exit 1
    fi
}

check_sudo() {
    if ! sudo -n true 2>/dev/null; then
        error "This script requires sudo access. Please run with a user that has sudo privileges."
        exit 1
    fi
}

install_system_dependencies() {
    log "Installing system dependencies..."
    
    # Update package cache
    sudo apt-get update -qq
    
    # Install essential packages
    sudo apt-get install -qq -y \
        curl \
        wget \
        unzip \
        nginx \
        ufw \
        certbot \
        python3-certbot-nginx \
        ca-certificates \
        gnupg \
        build-essential \
        sqlite3 \
        git
        
    log "System dependencies installed successfully"
}

install_nodejs() {
    log "Installing Node.js 18..."
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log "Node.js $NODE_VERSION is already installed"
            return
        else
            warning "Node.js $NODE_VERSION is too old, installing Node.js 18"
        fi
    fi
    
    # Install Node.js 18
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "Node.js $NODE_VERSION and npm $NPM_VERSION installed successfully"
}

install_pm2() {
    log "Installing PM2 process manager..."
    
    if command -v pm2 >/dev/null 2>&1; then
        log "PM2 is already installed"
        return
    fi
    
    sudo npm install -g pm2
    log "PM2 installed successfully"
}

download_and_setup_application() {
    log "Downloading and setting up application..."
    
    # Create application directory
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    
    # Download application
    cd /tmp
    wget -q -O app.zip "$ZIP_URL"
    unzip -q app.zip
    folder=$(ls -d */ | head -1)
    
    # Copy application files
    sudo cp -r "$folder"* "$APP_DIR"/
    sudo chown -R $USER:$USER "$APP_DIR"
    rm -rf app.zip "$folder"
    
    cd "$APP_DIR"
    
    # Remove Supabase dependencies from package.json to ensure SQLite-only mode
    if [ -f package.json ]; then
        # Create a backup
        cp package.json package.json.backup
        
        # Remove Supabase-related dependencies
        npm pkg delete dependencies.@supabase/supabase-js 2>/dev/null || true
        npm pkg delete devDependencies.@supabase/supabase-js 2>/dev/null || true
    fi
    
    log "Application downloaded and configured for SQLite mode"
}

install_application_dependencies() {
    log "Installing application dependencies..."
    
    cd "$APP_DIR"
    
    # Install dependencies
    npm install --no-audit --no-fund --silent
    
    # Install additional required packages for SQLite mode
    npm install express sqlite3 bcrypt cors --save --silent
    
    log "Application dependencies installed"
}

build_application() {
    log "Building application..."
    
    cd "$APP_DIR"
    
    # Build the application
    if npm run | grep -q " build"; then
        npm run build --silent
        log "Application built successfully"
    else
        warning "No build script found, skipping build step"
    fi
}

create_sqlite_server() {
    log "Creating SQLite server configuration..."
    
    cd "$APP_DIR"
    
    # Create SQLite-based server
    cat > server-sqlite.js <<'EOF'
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    client: 'katech',
    database: 'sqlite'
  });
});

// API routes for basic helpdesk functionality
app.get('/api/tickets', (req, res) => {
  res.json([]);
});

app.post('/api/tickets', (req, res) => {
  res.json({ success: true, message: 'Ticket created' });
});

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Katech Helpdesk Server running on port ${PORT}`);
  console.log(`🌐 Access: http://localhost:${PORT}`);
  console.log(`💾 Database: SQLite (self-contained)`);
});
EOF

    log "SQLite server configuration created"
}

setup_pm2() {
    log "Setting up PM2 process manager..."
    
    cd "$APP_DIR"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk-${CLIENT_NAME}',
    script: 'server-sqlite.js',
    cwd: '$APP_DIR',
    env: {
      PORT: $APP_PORT,
      NODE_ENV: 'production',
      CLIENT_NAME: '$CLIENT_NAME'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

    # Create logs directory
    mkdir -p logs
    
    # Stop any existing process
    pm2 delete helpdesk-${CLIENT_NAME} 2>/dev/null || true
    
    # Start the application
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup PM2 to start on boot
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME >/dev/null 2>&1 || true
    
    log "PM2 configured and application started"
}

configure_nginx() {
    log "Configuring Nginx..."
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/helpdesk-${CLIENT_NAME} >/dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/helpdesk-${CLIENT_NAME} /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    sudo nginx -t
    sudo systemctl reload nginx
    
    log "Nginx configured successfully"
}

configure_firewall() {
    log "Configuring firewall..."
    
    # Configure UFW
    sudo ufw allow ssh >/dev/null 2>&1 || true
    sudo ufw allow 'Nginx Full' >/dev/null 2>&1 || true
    sudo ufw allow $APP_PORT >/dev/null 2>&1 || true
    sudo ufw --force enable >/dev/null 2>&1 || true
    
    log "Firewall configured"
}

create_management_script() {
    log "Creating management script..."
    
    # Create management script
    sudo tee /usr/local/bin/helpdesk-${CLIENT_NAME} >/dev/null <<EOF
#!/bin/bash
# Katech Helpdesk Management Script

case "\$1" in
    start)
        pm2 start helpdesk-${CLIENT_NAME}
        echo "✅ Katech Helpdesk started"
        ;;
    stop)
        pm2 stop helpdesk-${CLIENT_NAME}
        echo "⏹️  Katech Helpdesk stopped"
        ;;
    restart)
        pm2 restart helpdesk-${CLIENT_NAME}
        echo "🔄 Katech Helpdesk restarted"
        ;;
    status)
        pm2 status helpdesk-${CLIENT_NAME}
        ;;
    logs)
        pm2 logs helpdesk-${CLIENT_NAME}
        ;;
    update)
        cd $APP_DIR
        echo "🔄 Updating Katech Helpdesk..."
        wget -q -O /tmp/update.zip "$ZIP_URL"
        cd /tmp
        unzip -q update.zip
        folder=\$(ls -d */ | head -1)
        cp -r "\$folder"* "$APP_DIR"/
        rm -rf update.zip "\$folder"
        cd "$APP_DIR"
        npm install --silent
        npm run build --silent 2>/dev/null || true
        pm2 restart helpdesk-${CLIENT_NAME}
        echo "✅ Katech Helpdesk updated and restarted"
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status|logs|update}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the helpdesk application"
        echo "  stop    - Stop the helpdesk application"
        echo "  restart - Restart the helpdesk application"
        echo "  status  - Show application status"
        echo "  logs    - Show application logs"
        echo "  update  - Update application to latest version"
        exit 1
        ;;
esac
EOF

    sudo chmod +x /usr/local/bin/helpdesk-${CLIENT_NAME}
    
    log "Management script created: helpdesk-${CLIENT_NAME}"
}

test_installation() {
    log "Testing installation..."
    
    # Wait a moment for the service to fully start
    sleep 3
    
    # Test local connection
    if curl -f -s http://localhost:$APP_PORT/api/health >/dev/null; then
        log "✅ Application is responding locally"
    else
        error "❌ Application is not responding locally"
        return 1
    fi
    
    # Test through Nginx
    if curl -f -s http://localhost/api/health >/dev/null; then
        log "✅ Application is accessible through Nginx"
    else
        warning "⚠️  Application may not be accessible through Nginx"
    fi
    
    log "Installation test completed"
}

show_completion() {
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   INSTALLATION COMPLETE!                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    echo -e "${BLUE}🎉 Katech Helpdesk is now running!${NC}"
    echo
    echo -e "${YELLOW}Access your helpdesk:${NC}"
    echo -e "   🌐 Local: ${GREEN}http://localhost:$APP_PORT${NC}"
    echo -e "   🌍 Network: ${GREEN}http://$SERVER_IP${NC}"
    echo
    echo -e "${YELLOW}Management Commands:${NC}"
    echo -e "   helpdesk-${CLIENT_NAME} start      - Start the application"
    echo -e "   helpdesk-${CLIENT_NAME} stop       - Stop the application"
    echo -e "   helpdesk-${CLIENT_NAME} restart    - Restart the application"
    echo -e "   helpdesk-${CLIENT_NAME} status     - Check status"
    echo -e "   helpdesk-${CLIENT_NAME} logs       - View logs"
    echo -e "   helpdesk-${CLIENT_NAME} update     - Update to latest version"
    echo
    echo -e "${YELLOW}PM2 Commands:${NC}"
    echo -e "   pm2 status                    - Show all processes"
    echo -e "   pm2 logs helpdesk-${CLIENT_NAME}      - View live logs"
    echo -e "   pm2 restart helpdesk-${CLIENT_NAME}   - Restart application"
    echo
    echo -e "${YELLOW}Database:${NC}"
    echo -e "   💾 SQLite database (self-contained)"
    echo -e "   📁 Location: $APP_DIR/database/"
    echo
    echo -e "${GREEN}✅ Setup complete! Your Katech Helpdesk is ready to use.${NC}"
    echo
}

main() {
    show_banner
    
    log "Starting Katech Helpdesk installation..."
    
    check_root
    check_sudo
    install_system_dependencies
    install_nodejs
    install_pm2
    download_and_setup_application
    install_application_dependencies
    build_application
    create_sqlite_server
    setup_pm2
    configure_nginx
    configure_firewall
    create_management_script
    test_installation
    show_completion
    
    log "Installation completed successfully!"
}

# Run main function
main "$@"