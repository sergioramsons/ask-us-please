#!/bin/bash
# Supabase Client Deployment Installer
# Multi-client helpdesk deployment with Supabase backend
# Usage: bash supabase-client-installer.sh [client-name] [domain]

set -euo pipefail

# Configuration
CLIENT_NAME=${1:-}
DOMAIN=${2:-localhost}
APP_DIR="/var/www/${CLIENT_NAME:-helpdesk}"
INSTALL_LOG="/tmp/helpdesk-supabase-install.log"
GITHUB_REPO="https://github.com/sergioramsons/ask-us-please/archive/refs/heads/main.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$INSTALL_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$INSTALL_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$INSTALL_LOG"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$INSTALL_LOG"
}

# Welcome banner
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║        Supabase Helpdesk Installer       ║"
    echo "║        Multi-Client Deployment           ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Validate input parameters
validate_inputs() {
    if [[ -z "$CLIENT_NAME" ]]; then
        error "Client name is required"
        echo "Usage: bash supabase-client-installer.sh [client-name] [domain]"
        echo "Example: bash supabase-client-installer.sh acme-corp acme.helpdesk.com"
        exit 1
    fi
    
    # Validate client name format
    if [[ ! "$CLIENT_NAME" =~ ^[a-z0-9-]+$ ]]; then
        error "Client name must contain only lowercase letters, numbers, and hyphens"
        exit 1
    fi
    
    log "Installing helpdesk for client: $CLIENT_NAME"
    log "Domain: $DOMAIN"
    log "Installation directory: $APP_DIR"
}

# Check prerequisites
check_prerequisites() {
    log "Checking system prerequisites..."
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        error "Don't run as root. Create a user account first."
        echo "sudo adduser helpdesk && sudo usermod -aG sudo helpdesk"
        exit 1
    fi
    
    # Check for required commands
    local required_commands=("curl" "wget" "unzip" "node" "npm")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $node_version -lt 18 ]]; then
        error "Node.js 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    sudo apt-get update -qq
    sudo apt-get install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        git \
        build-essential
    
    # Install PM2 if not present
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    log "Dependencies installed successfully"
}

# Download and setup application
setup_application() {
    log "Setting up application for client: $CLIENT_NAME..."
    
    # Create application directory
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    
    # Download application
    cd /tmp
    log "Downloading latest application code..."
    wget -q --show-progress -O helpdesk-${CLIENT_NAME}.zip "$GITHUB_REPO"
    
    # Extract application
    unzip -q helpdesk-${CLIENT_NAME}.zip
    local extracted_dir=$(ls -d ask-us-please-*/ | head -1)
    
    # Copy files to installation directory
    cp -r "${extracted_dir}"* "$APP_DIR/"
    rm -rf helpdesk-${CLIENT_NAME}.zip "$extracted_dir"
    
    # Set proper permissions
    chmod -R 755 "$APP_DIR"
    
    log "Application files installed successfully"
}

# Configure Supabase environment
configure_supabase() {
    log "Configuring Supabase environment..."
    
    cd "$APP_DIR"
    
    echo -e "${YELLOW}"
    echo "╔══════════════════════════════════════════╗"
    echo "║           SUPABASE CONFIGURATION          ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "Please provide your Supabase project details for client: $CLIENT_NAME"
    echo ""
    
    # Get Supabase project details
    read -p "Supabase Project URL (e.g., https://xyz.supabase.co): " SUPABASE_URL
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    read -p "Organization Name for $CLIENT_NAME: " ORG_NAME
    
    # Validate Supabase URL format
    if [[ ! "$SUPABASE_URL" =~ ^https://[a-z0-9]+\.supabase\.co$ ]]; then
        error "Invalid Supabase URL format. Should be: https://projectid.supabase.co"
        exit 1
    fi
    
    # Create environment configuration
    cat > .env.production << EOF
# Supabase Configuration for ${CLIENT_NAME}
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Client Configuration
CLIENT_NAME=${CLIENT_NAME}
ORGANIZATION_NAME=${ORG_NAME}
DOMAIN=${DOMAIN}
NODE_ENV=production
EOF
    
    # Update package.json with client-specific info
    if command -v jq &> /dev/null; then
        jq ".name = \"helpdesk-${CLIENT_NAME}\"" package.json > package.tmp.json && mv package.tmp.json package.json
    fi
    
    log "Supabase configuration completed"
}

# Install application dependencies and build
install_and_build() {
    log "Installing application dependencies..."
    
    cd "$APP_DIR"
    
    # Install dependencies
    npm ci --production=false --silent
    
    # Build application
    log "Building application for production..."
    npm run build
    
    log "Application built successfully"
}

# Create production server
create_production_server() {
    log "Creating production server..."
    
    cd "$APP_DIR"
    
    # Create production server
    cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const CLIENT_NAME = process.env.CLIENT_NAME || 'helpdesk';
const DIST_PATH = path.join(__dirname, 'dist');

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Static files with caching
app.use(express.static(DIST_PATH, {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        client: CLIENT_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// SPA catch-all route
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ ${CLIENT_NAME} helpdesk server running on port ${PORT}`);
    console.log(`📁 Serving from: ${DIST_PATH}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
EOF

    # Install express if not already in dependencies
    if ! npm list express &>/dev/null; then
        npm install express --save
    fi
    
    log "Production server created"
}

# Setup PM2 process management
setup_pm2() {
    log "Setting up PM2 process management..."
    
    cd "$APP_DIR"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
    apps: [{
        name: 'helpdesk-${CLIENT_NAME}',
        script: 'server.js',
        cwd: '${APP_DIR}',
        instances: 1,
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: 3000,
            CLIENT_NAME: '${CLIENT_NAME}'
        },
        error_file: '/var/log/helpdesk-${CLIENT_NAME}-error.log',
        out_file: '/var/log/helpdesk-${CLIENT_NAME}-out.log',
        log_file: '/var/log/helpdesk-${CLIENT_NAME}.log',
        time: true,
        max_restarts: 10,
        min_uptime: '10s',
        max_memory_restart: '500M',
        node_args: '--max-old-space-size=256'
    }]
};
EOF

    # Create log directory
    sudo mkdir -p /var/log
    sudo touch /var/log/helpdesk-${CLIENT_NAME}-error.log
    sudo touch /var/log/helpdesk-${CLIENT_NAME}-out.log
    sudo touch /var/log/helpdesk-${CLIENT_NAME}.log
    sudo chown $USER:$USER /var/log/helpdesk-${CLIENT_NAME}*.log
    
    # Stop existing process if running
    pm2 delete helpdesk-${CLIENT_NAME} 2>/dev/null || true
    
    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup startup script
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
    
    log "PM2 configured successfully"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/helpdesk-${CLIENT_NAME} > /dev/null << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Client identifier
    add_header X-Client-Name "${CLIENT_NAME}" always;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/helpdesk-${CLIENT_NAME} /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    log "Nginx configured successfully"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    log "Firewall configured"
}

# Create management scripts
create_management_scripts() {
    log "Creating management scripts..."
    
    # Create client-specific management scripts
    sudo tee /usr/local/bin/helpdesk-${CLIENT_NAME} > /dev/null << EOF
#!/bin/bash
# Helpdesk management script for ${CLIENT_NAME}

case "\$1" in
    start)
        echo "🚀 Starting ${CLIENT_NAME} helpdesk..."
        cd ${APP_DIR} && pm2 start ecosystem.config.js
        sudo systemctl start nginx
        ;;
    stop)
        echo "🛑 Stopping ${CLIENT_NAME} helpdesk..."
        pm2 stop helpdesk-${CLIENT_NAME}
        ;;
    restart)
        echo "🔄 Restarting ${CLIENT_NAME} helpdesk..."
        pm2 restart helpdesk-${CLIENT_NAME}
        ;;
    status)
        echo "📊 Status for ${CLIENT_NAME} helpdesk:"
        echo "=================================="
        pm2 status helpdesk-${CLIENT_NAME}
        echo ""
        curl -s http://127.0.0.1:3000/health || echo "Service not responding"
        ;;
    logs)
        pm2 logs helpdesk-${CLIENT_NAME} --lines 50
        ;;
    update)
        echo "⬆️ Updating ${CLIENT_NAME} helpdesk..."
        cd ${APP_DIR}
        git pull 2>/dev/null || echo "No git repository found - manual update required"
        npm ci --production=false
        npm run build
        pm2 restart helpdesk-${CLIENT_NAME}
        echo "✅ Update completed"
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status|logs|update}"
        exit 1
        ;;
esac
EOF

    sudo chmod +x /usr/local/bin/helpdesk-${CLIENT_NAME}
    
    log "Management script created: helpdesk-${CLIENT_NAME}"
}

# Test installation
test_installation() {
    log "Testing installation..."
    
    # Wait for application to start
    sleep 5
    
    # Test local connectivity
    if curl -sf http://127.0.0.1:3000/health > /dev/null; then
        log "✅ Application responding locally"
    else
        error "❌ Application not responding locally"
        return 1
    fi
    
    # Test through Nginx
    if curl -sf http://localhost > /dev/null 2>&1; then
        log "✅ Application accessible through Nginx"
    else
        warning "⚠️ Application may not be accessible through Nginx"
    fi
    
    return 0
}

# Show completion information
show_completion() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗"
    echo "║         ✅ INSTALLATION COMPLETE          ║"
    echo "╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}🎉 Client Setup Complete: ${CLIENT_NAME}${NC}"
    echo ""
    echo "🌐 Access Information:"
    echo "   • URL: http://$DOMAIN"
    echo "   • Health Check: http://$DOMAIN/health"
    echo ""
    echo "🛠️ Management Commands:"
    echo "   • Start:    helpdesk-${CLIENT_NAME} start"
    echo "   • Stop:     helpdesk-${CLIENT_NAME} stop"
    echo "   • Restart:  helpdesk-${CLIENT_NAME} restart"
    echo "   • Status:   helpdesk-${CLIENT_NAME} status"
    echo "   • Logs:     helpdesk-${CLIENT_NAME} logs"
    echo "   • Update:   helpdesk-${CLIENT_NAME} update"
    echo ""
    echo "📁 Installation Directory: $APP_DIR"
    echo "📄 Installation Log: $INSTALL_LOG"
    echo ""
    echo "🔒 SSL Certificate (recommended):"
    echo "   sudo certbot --nginx -d $DOMAIN"
    echo ""
    echo -e "${YELLOW}⚠️ IMPORTANT NEXT STEPS:${NC}"
    echo "1. Set up your Supabase database schema"
    echo "2. Configure RLS policies in Supabase"
    echo "3. Set up email providers if needed"
    echo "4. Configure organization settings"
    echo ""
    echo -e "${CYAN}For support: Check logs with 'helpdesk-${CLIENT_NAME} logs'${NC}"
}

# Main installation function
main() {
    show_banner
    validate_inputs
    
    log "Starting installation for client: $CLIENT_NAME"
    log "Installation log: $INSTALL_LOG"
    
    check_prerequisites
    install_dependencies
    setup_application
    configure_supabase
    install_and_build
    create_production_server
    setup_pm2
    configure_nginx
    configure_firewall
    create_management_scripts
    
    if test_installation; then
        show_completion
    else
        error "Installation completed with errors. Check logs: $INSTALL_LOG"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"