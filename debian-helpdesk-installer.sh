#!/bin/bash

# BS-HelpDesk Debian 12 Installation Script
# Clean, reliable installer for Debian-based systems

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}" >&2; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Don't run as root. Use a regular user with sudo."
        exit 1
    fi
}

install_prerequisites() {
    log "Installing prerequisites on Debian 12..."
    
    sudo apt update
    sudo apt install -y curl wget git nginx ufw certbot python3-certbot-nginx build-essential
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # Install PM2
    sudo npm install -g pm2
    
    log "Prerequisites installed"
}

get_config() {
    log "Configuration setup:"
    echo
    
    read -p "GitHub repo URL: " GITHUB_REPO
    [[ -z "$GITHUB_REPO" ]] && { error "GitHub repo required"; exit 1; }
    
    read -p "Domain name: " DOMAIN_NAME
    [[ -z "$DOMAIN_NAME" ]] && { error "Domain required"; exit 1; }
    
    read -p "App directory [helpdesk]: " APP_DIR
    APP_DIR=${APP_DIR:-helpdesk}
    
    read -p "Port [3000]: " APP_PORT
    APP_PORT=${APP_PORT:-3000}
    
    echo
    info "Config: $GITHUB_REPO -> $DOMAIN_NAME:$APP_PORT in ~/$APP_DIR"
    echo
    
    read -p "Continue? (y/N): " CONFIRM
    [[ ! $CONFIRM =~ ^[Yy]$ ]] && { log "Cancelled"; exit 0; }
}

setup_app() {
    log "Setting up application..."
    
    [[ -d "$HOME/$APP_DIR" ]] && {
        warning "Removing existing $HOME/$APP_DIR"
        rm -rf "$HOME/$APP_DIR"
    }
    
    cd "$HOME"
    git clone "$GITHUB_REPO" "$APP_DIR"
    cd "$APP_DIR"
    
    npm install
    
    # Create .env without heredoc
    : > .env
    echo "# Supabase Configuration" >> .env
    echo "VITE_SUPABASE_URL=https://thzdazcmswmeolaiijml.supabase.co" >> .env
    echo "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoemRhemNtc3dtZW9sYWlpam1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDQzNTYsImV4cCI6MjA3MDgyMDM1Nn0.YL3OuA8zhliqJSDw8qzZjvonTXJPc9INBv-b10g_tEQ" >> .env
    echo "" >> .env
    echo "# Application Configuration" >> .env
    echo "NODE_ENV=production" >> .env
    echo "PORT=$APP_PORT" >> .env
    
    npm run build
    
    # Create server.js
    cat > server.js << 'SERVERJS'
const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const port = process.env.PORT || 3000;

app.use(compression());

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;");
    next();
});

app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '1y',
    etag: true
}));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
    console.log(`✅ BS-HelpDesk running on http://127.0.0.1:${port}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
});

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully');
    process.exit(0);
});
SERVERJS
    
    npm install compression
    
    log "Application setup complete"
}

configure_nginx() {
    log "Configuring Nginx..."
    
    sudo tee /etc/nginx/sites-available/$APP_DIR > /dev/null << NGINXCONF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
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
    
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
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
        
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    location ~* \.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINXCONF
    
    sudo ln -sf /etc/nginx/sites-available/$APP_DIR /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl reload nginx
    
    log "Nginx configured"
}

setup_pm2() {
    log "Setting up PM2..."
    
    cd "$HOME/$APP_DIR"
    
    # Create ecosystem file
    cat > ecosystem.config.cjs << 'ECOCONF'
module.exports = {
  apps: [{
    name: '__APP_NAME__',
    script: 'server.js',
    cwd: '__APP_PATH__',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: __APP_PORT__
    },
    error_file: '__APP_PATH__/logs/err.log',
    out_file: '__APP_PATH__/logs/out.log',
    log_file: '__APP_PATH__/logs/combined.log',
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
ECOCONF
    
    # Replace placeholders
sed -i "s/__APP_NAME__/$APP_DIR/g" ecosystem.config.cjs
sed -i "s|__APP_PATH__|$HOME/$APP_DIR|g" ecosystem.config.cjs
sed -i "s/__APP_PORT__/$APP_PORT/g" ecosystem.config.cjs
    
    mkdir -p logs
    pm2 start ecosystem.config.cjs
    pm2 save
    sudo env PATH=$PATH:/usr/bin "$(which pm2)" startup systemd -u "$(whoami)" --hp "$(eval echo ~"$(whoami)")"
    
    log "PM2 setup complete"
}

configure_firewall() {
    log "Configuring UFW firewall..."
    
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
    
    log "Firewall configured"
}

setup_ssl() {
    log "SSL certificate setup..."
    
    info "Make sure $DOMAIN_NAME points to this server's IP"
    read -p "Is DNS configured? (y/N): " DNS_READY
    
    if [[ $DNS_READY =~ ^[Yy]$ ]]; then
        sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "admin@$DOMAIN_NAME" || {
            warning "SSL failed. Run later: sudo certbot --nginx -d $DOMAIN_NAME"
        }
    else
        warning "Configure DNS first, then run: sudo certbot --nginx -d $DOMAIN_NAME"
    fi
}

create_maintenance() {
    log "Creating maintenance scripts..."
    
    # Update script
    cat > "$HOME/$APP_DIR/update.sh" << 'UPDATESH'
#!/bin/bash
set -e
APP_DIR="__APP_PATH__"
BACKUP_DIR="$HOME/helpdesk-backups"

echo "🔄 Starting update..."
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="helpdesk-backup-$(date +%Y%m%d-%H%M%S)"
cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME"

cd "$APP_DIR"
git pull origin main
npm install
npm run build
pm2 restart __APP_NAME__

echo "✅ Update complete!"
pm2 status __APP_NAME__
UPDATESH
    
    sed -i "s|__APP_PATH__|$HOME/$APP_DIR|g" "$HOME/$APP_DIR/update.sh"
    sed -i "s/__APP_NAME__/$APP_DIR/g" "$HOME/$APP_DIR/update.sh"
    chmod +x "$HOME/$APP_DIR/update.sh"
    
    # Status script
    cat > "$HOME/$APP_DIR/status.sh" << 'STATUSSH'
#!/bin/bash
echo "🏥 BS-HelpDesk System Status"
echo "=========================="
echo
echo "📊 Application:"
pm2 status __APP_NAME__
echo
echo "🌐 Nginx:"
sudo systemctl status nginx --no-pager -l
echo
echo "🔒 SSL:"
sudo certbot certificates
echo
echo "💾 Disk:"
df -h "__APP_PATH__"
echo
echo "🧠 Memory:"
free -h
echo
echo "🔥 Recent Logs:"
pm2 logs __APP_NAME__ --lines 10
STATUSSH
    
    sed -i "s|__APP_PATH__|$HOME/$APP_DIR|g" "$HOME/$APP_DIR/status.sh"
    sed -i "s/__APP_NAME__/$APP_DIR/g" "$HOME/$APP_DIR/status.sh"
    chmod +x "$HOME/$APP_DIR/status.sh"
    
    log "Maintenance scripts created"
}

main() {
    log "Starting BS-HelpDesk installation on Debian 12..."
    
    check_root
    get_config
    install_prerequisites
    setup_app
    configure_nginx
    setup_pm2
    configure_firewall
    setup_ssl
    create_maintenance
    
    log "🎉 Installation complete!"
    echo
    info "🌐 Access: https://$DOMAIN_NAME"
    info "📁 Directory: $HOME/$APP_DIR"
    info "🔧 Update: $HOME/$APP_DIR/update.sh"
    info "📊 Status: $HOME/$APP_DIR/status.sh"
    echo
    info "Commands:"
    info "  pm2 status $APP_DIR"
    info "  pm2 logs $APP_DIR"
    info "  pm2 restart $APP_DIR"
    echo
    warning "Next steps:"
    warning "1. Point $DOMAIN_NAME DNS to this server"
    warning "2. Run SSL: sudo certbot --nginx -d $DOMAIN_NAME"
    warning "3. Test: curl -I https://$DOMAIN_NAME/health"
}

main "$@"