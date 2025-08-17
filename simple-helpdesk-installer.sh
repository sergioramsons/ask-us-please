#!/bin/bash

# Simple Helpdesk Installer for Debian 12
# This script installs a helpdesk application with minimal user input

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +%H:%M:%S)] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Don't run as root. Use a regular user with sudo privileges."
    fi
}

# Install prerequisites
install_prerequisites() {
    log "Installing prerequisites..."
    
    sudo apt update
    sudo apt install -y curl wget git nginx ufw certbot python3-certbot-nginx build-essential
    
    # Install Node.js 18
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install PM2
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi
    
    log "Prerequisites installed successfully"
}

# Get configuration with proper validation
get_config() {
    echo
    info "Please provide the following information:"
    
    while [[ -z "$GITHUB_REPO" ]]; do
        echo -n "GitHub repository URL: "
        read GITHUB_REPO
        if [[ ! "$GITHUB_REPO" =~ ^https://github\.com/.+\.git$ ]]; then
            warning "Please enter a valid GitHub repository URL (ending with .git)"
            GITHUB_REPO=""
        fi
    done
    
    while [[ -z "$DOMAIN_NAME" ]]; do
        echo -n "Domain name (e.g., helpdesk.yourdomain.com): "
        read DOMAIN_NAME
        if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
            warning "Please enter a valid domain name"
            DOMAIN_NAME=""
        fi
    done
    
    echo -n "Application directory [/opt/helpdesk]: "
    read APP_DIR
    APP_DIR=${APP_DIR:-/opt/helpdesk}
    
    echo -n "Application port [3000]: "
    read APP_PORT
    APP_PORT=${APP_PORT:-3000}
    
    echo
    log "Configuration:"
    log "Repository: $GITHUB_REPO"
    log "Domain: $DOMAIN_NAME"
    log "Directory: $APP_DIR"
    log "Port: $APP_PORT"
    echo
    
    echo -n "Continue with installation? (y/N): "
    read CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        error "Installation cancelled"
    fi
}

# Setup application
setup_app() {
    log "Setting up application..."
    
    # Create directory
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    
    # Clone repository
    if [ -d "$APP_DIR/.git" ]; then
        cd "$APP_DIR"
        git pull
    else
        git clone "$GITHUB_REPO" "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    # Install dependencies
    npm install
    
    # Create .env file
    cat > .env << EOF
VITE_SUPABASE_URL=https://thzdazcmswmeolaiijml.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoemRhemNtc3dtZW9sYWlpam1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQzNTYsImV4cCI6MjA3MDgyMDM1Nn0.YL3OuA8zhliqJSDw8qzZjvonTXJPc9INBv-b10g_tEQ
PORT=$APP_PORT
NODE_ENV=production
EOF
    
    # Build application
    npm run build
    
    # Create simple server
    cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF
    
    # Install express if not present
    npm install express
    
    log "Application setup completed"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    sudo tee /etc/nginx/sites-available/$DOMAIN_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    
    log "Nginx configured successfully"
}

# Setup PM2
setup_pm2() {
    log "Setting up PM2..."
    
    cd "$APP_DIR"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    }
  }]
};
EOF
    
    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    log "PM2 configured successfully"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    log "Firewall configured successfully"
}

# Setup SSL
setup_ssl() {
    log "Setting up SSL certificate..."
    
    echo -n "Is your domain DNS configured to point to this server? (y/N): "
    read DNS_READY
    
    if [[ "$DNS_READY" =~ ^[Yy]$ ]]; then
        sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email admin@"$DOMAIN_NAME"
        log "SSL certificate installed successfully"
    else
        warning "Skipping SSL setup. Configure DNS first, then run: sudo certbot --nginx -d $DOMAIN_NAME"
    fi
}

# Main installation function
main() {
    log "Starting Simple Helpdesk Installer for Debian 12"
    
    check_root
    install_prerequisites
    get_config
    setup_app
    configure_nginx
    setup_pm2
    configure_firewall
    setup_ssl
    
    echo
    log "Installation completed successfully!"
    log "Your helpdesk is now running at: http://$DOMAIN_NAME"
    log "Application directory: $APP_DIR"
    log "Application port: $APP_PORT"
    echo
    info "Useful commands:"
    info "  Check status: pm2 status"
    info "  View logs: pm2 logs helpdesk"
    info "  Restart app: pm2 restart helpdesk"
    info "  Update app: cd $APP_DIR && git pull && npm install && npm run build && pm2 restart helpdesk"
}

# Run main function
main