#!/bin/bash

# BS-HelpDesk VPS Installation Script
# This script installs and configures the helpdesk application on a VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons."
        error "Please run as a regular user with sudo privileges."
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Cannot detect OS. This script supports Ubuntu/Debian/CentOS/RHEL."
        exit 1
    fi
    log "Detected OS: $OS $VER"
}

# Install prerequisites based on OS
install_prerequisites() {
    log "Installing prerequisites..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        sudo apt update
        sudo apt install -y curl wget git nginx ufw certbot python3-certbot-nginx build-essential
        
        # Install Node.js 18.x
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
        
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"Rocky"* ]]; then
        sudo yum update -y
        sudo yum install -y curl wget git nginx firewalld gcc-c++ make
        
        # Install Node.js 18.x
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
        
        # Install certbot
        sudo yum install -y epel-release
        sudo yum install -y certbot python3-certbot-nginx
    else
        error "Unsupported OS: $OS"
        exit 1
    fi
    
    # Install PM2 globally
    sudo npm install -g pm2
    
    log "Prerequisites installed successfully"
}

# Get configuration from user
get_configuration() {
    log "Please provide the following configuration details:"
    
    echo
    read -p "Enter your GitHub repository URL (e.g., https://github.com/username/helpdesk): " GITHUB_REPO
    if [[ -z "$GITHUB_REPO" ]]; then
        error "GitHub repository URL is required"
        exit 1
    fi
    
    read -p "Enter your domain name (e.g., helpdesk.yourdomain.com): " DOMAIN_NAME
    if [[ -z "$DOMAIN_NAME" ]]; then
        error "Domain name is required"
        exit 1
    fi
    
    read -p "Enter application directory name [helpdesk]: " APP_DIR
    APP_DIR=${APP_DIR:-helpdesk}
    
    read -p "Enter the port for the application [3000]: " APP_PORT
    APP_PORT=${APP_PORT:-3000}
    
    echo
    info "Configuration Summary:"
    info "Repository: $GITHUB_REPO"
    info "Domain: $DOMAIN_NAME"
    info "App Directory: $APP_DIR"
    info "Port: $APP_PORT"
    echo
    
    read -p "Continue with installation? (y/N): " CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        log "Installation cancelled"
        exit 0
    fi
}

# Clone and setup application
setup_application() {
    log "Setting up application..."
    
    # Remove existing directory if it exists
    if [[ -d "$HOME/$APP_DIR" ]]; then
        warning "Directory $HOME/$APP_DIR already exists. Removing..."
        rm -rf "$HOME/$APP_DIR"
    fi
    
    # Clone repository
    log "Cloning repository..."
    cd "$HOME"
    git clone "$GITHUB_REPO" "$APP_DIR"
    cd "$APP_DIR"
    
    # Install dependencies
    log "Installing dependencies..."
    npm install
    
    # Create environment file without heredoc to avoid EOF issues
    log "Creating environment configuration..."
    : > .env
    printf "%s\n" "# Supabase Configuration" >> .env
    printf "%s\n" "VITE_SUPABASE_URL=https://thzdazcmswmeolaiijml.supabase.co" >> .env
    printf "%s\n" "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoemRhemNtc3dtZW9sYWlpam1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQzNTYsImV4cCI6MjA3MDgyMDM1Nn0.YL3OuA8zhliqJSDw8qzZjvonTXJPc9INBv-b10g_tEQ" >> .env
    printf "%s\n" "" >> .env
    printf "%s\n" "# Application Configuration" >> .env
    printf "%s\n" "NODE_ENV=production" >> .env
    printf "%s\n" "PORT=${APP_PORT}" >> .env
    
    # Build application
    log "Building application..."
    npm run build
    
    # Create server.js for production
    log "Creating production server..."
    cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;

// Enable compression
app.use(compression());

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;");
    next();
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y',
    etag: true
}));

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
    console.log(`✅ BS-HelpDesk running on http://127.0.0.1:${port}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully');
    process.exit(0);
});
EOF
    
    # Install compression if not already in dependencies
    npm install compression
    
    log "Application setup completed"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..."
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/$APP_DIR << EOF
# BS-HelpDesk Nginx Configuration
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Main location
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
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Static assets with long cache
    location ~* \.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Cache static assets
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$APP_DIR /etc/nginx/sites-enabled/
    
    # Remove default site if it exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    log "Nginx configured successfully"
}

# Setup PM2
setup_pm2() {
    log "Setting up PM2 process manager..."
    
    cd "$HOME/$APP_DIR"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_DIR',
    script: 'server.js',
    cwd: '$HOME/$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },
    error_file: '$HOME/$APP_DIR/logs/err.log',
    out_file: '$HOME/$APP_DIR/logs/out.log',
    log_file: '$HOME/$APP_DIR/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000
  }]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    
    # Start application with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    sudo env PATH=$PATH:/usr/bin $(which pm2) startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
    
    log "PM2 setup completed"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    if [[ $OS == *"Ubuntu"* ]] || [[ $OS == *"Debian"* ]]; then
        # UFW for Ubuntu/Debian
        sudo ufw --force reset
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 'Nginx Full'
        sudo ufw --force enable
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]] || [[ $OS == *"Rocky"* ]]; then
        # Firewalld for CentOS/RHEL
        sudo systemctl start firewalld
        sudo systemctl enable firewalld
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
    fi
    
    log "Firewall configured"
}

# Setup SSL certificate
setup_ssl() {
    log "Setting up SSL certificate..."
    
    info "Attempting to obtain SSL certificate for $DOMAIN_NAME"
    info "Make sure your domain is pointing to this server's IP address"
    
    read -p "Is your domain already pointing to this server? (y/N): " DNS_READY
    if [[ ! $DNS_READY =~ ^[Yy]$ ]]; then
        warning "Please configure your DNS first and then run:"
        warning "sudo certbot --nginx -d $DOMAIN_NAME"
        return
    fi
    
    # Obtain SSL certificate
    sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME || {
        warning "SSL certificate installation failed. You can try again later with:"
        warning "sudo certbot --nginx -d $DOMAIN_NAME"
    }
    
    log "SSL setup completed"
}

# Create maintenance script
create_maintenance_script() {
    log "Creating maintenance scripts..."
    
    # Create update script
    cat > "$HOME/$APP_DIR/update.sh" << EOF
#!/bin/bash
# BS-HelpDesk Update Script

set -e

APP_DIR="$HOME/$APP_DIR"
BACKUP_DIR="$HOME/helpdesk-backups"

echo "🔄 Starting update process..."

# Create backup directory
mkdir -p "\$BACKUP_DIR"

# Create backup
BACKUP_NAME="helpdesk-backup-\$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup: \$BACKUP_NAME"
cp -r "\$APP_DIR" "\$BACKUP_DIR/\$BACKUP_NAME"

cd "\$APP_DIR"

# Pull latest changes
echo "⬇️  Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Restart PM2
echo "🔄 Restarting application..."
pm2 restart $APP_DIR

echo "✅ Update completed successfully!"
echo "📊 Application status:"
pm2 status $APP_DIR
EOF
    
    chmod +x "$HOME/$APP_DIR/update.sh"
    
    # Create status script
    cat > "$HOME/$APP_DIR/status.sh" << EOF
#!/bin/bash
# BS-HelpDesk Status Script

echo "🏥 BS-HelpDesk System Status"
echo "=========================="
echo

echo "📊 Application Status:"
pm2 status $APP_DIR
echo

echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l
echo

echo "🔒 SSL Certificate Status:"
sudo certbot certificates
echo

echo "💾 Disk Usage:"
df -h "$HOME/$APP_DIR"
echo

echo "🧠 Memory Usage:"
free -h
echo

echo "🔥 Recent Logs:"
pm2 logs $APP_DIR --lines 10
EOF
    
    chmod +x "$HOME/$APP_DIR/status.sh"
    
    log "Maintenance scripts created"
}

# Main installation function
main() {
    log "Starting BS-HelpDesk installation..."
    
    check_root
    detect_os
    get_configuration
    install_prerequisites
    setup_application
    configure_nginx
    setup_pm2
    configure_firewall
    setup_ssl
    create_maintenance_script
    
    log "🎉 Installation completed successfully!"
    echo
    info "🌐 Your helpdesk should be accessible at: https://$DOMAIN_NAME"
    info "📁 Application directory: $HOME/$APP_DIR"
    info "🔧 Update your app: $HOME/$APP_DIR/update.sh"
    info "📊 Check status: $HOME/$APP_DIR/status.sh"
    echo
    info "Useful commands:"
    info "  pm2 status $APP_DIR        # Check application status"
    info "  pm2 logs $APP_DIR          # View application logs"
    info "  pm2 restart $APP_DIR       # Restart application"
    info "  sudo nginx -t               # Test Nginx configuration"
    info "  sudo systemctl status nginx # Check Nginx status"
    echo
    warning "Next steps:"
    warning "1. Make sure your domain DNS is pointing to this server"
    warning "2. If SSL failed, run: sudo certbot --nginx -d $DOMAIN_NAME"
    warning "3. Configure your GitHub repository for automatic deployments"
}

# Run main function
main "$@"