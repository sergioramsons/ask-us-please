#!/bin/bash

#########################################
# 🎫 HELPDESK INSTALLER v2.0
# 
# Easy installation script for Ubuntu/Debian VPS
# Supports both SQLite and Supabase backends
#
# Usage: 
#   wget https://raw.githubusercontent.com/your-repo/main/install.sh
#   bash install.sh
#########################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/helpdesk"
APP_PORT="3000"
SQLITE_PORT="3001"
GITHUB_REPO="https://github.com/sergioramsons/ask-us-please"
DOMAIN_NAME=""
ADMIN_EMAIL=""
INSTALL_SSL="n"
USE_SQLITE="y"

print_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║              🎫 HELPDESK INSTALLER v2.0                  ║"
    echo "║                                                          ║"
    echo "║         Easy installation for Ubuntu/Debian VPS         ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
}

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
question() { echo -e "${BLUE}[INPUT]${NC} $1"; }

check_system() {
    log "Checking system requirements..."
    
    # Allow root execution for VPS installations
    if [[ ${EUID:-$(id -u)} -eq 0 ]]; then
        warn "Running as root. Some commands will run without sudo."
    fi
    
    if ! sudo -n true 2>/dev/null; then
        warn "This script requires sudo privileges. You may be prompted for your password."
    fi
    
    if [[ ! -f /etc/debian_version ]] && [[ ! -f /etc/ubuntu_version ]]; then
        error "This script is designed for Ubuntu/Debian systems only."
    fi
    
    if ! ping -c 1 google.com &> /dev/null; then
        error "No internet connection available. Please check your network."
    fi
    
    success "System checks passed!"
}

get_configuration() {
    echo -e "\n${WHITE}📋 CONFIGURATION${NC}"
    echo "=================================="
    
    while [[ -z "$DOMAIN_NAME" ]]; do
        question "Enter your domain name (e.g., helpdesk.yourdomain.com):"
        read -r DOMAIN_NAME
        if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
            warn "Invalid domain name format. Please try again."
            DOMAIN_NAME=""
        fi
    done
    
    question "Installation directory [${APP_DIR}]:"
    read -r input_dir
    if [[ -n "$input_dir" ]]; then
        APP_DIR="$input_dir"
    fi
    
    question "Application port [${APP_PORT}]:"
    read -r input_port
    if [[ -n "$input_port" ]] && [[ "$input_port" =~ ^[0-9]+$ ]]; then
        APP_PORT="$input_port"
    fi
    
    echo -e "\n${PURPLE}Database Options:${NC}"
    echo "1) SQLite (Recommended for VPS - No external dependencies)"
    echo "2) Supabase (Cloud database - Requires account)"
    question "Choose database [1]:"
    read -r db_choice
    
    if [[ "$db_choice" == "2" ]]; then
        USE_SQLITE="n"
        warn "You'll need to configure Supabase credentials after installation."
    fi
    
    question "Install SSL certificate with Let's Encrypt? (y/n) [n]:"
    read -r ssl_choice
    if [[ "$ssl_choice" =~ ^[Yy]$ ]]; then
        INSTALL_SSL="y"
        question "Enter your email for SSL certificate notifications:"
        read -r ADMIN_EMAIL
        if [[ ! "$ADMIN_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
            warn "Invalid email format. SSL installation will be skipped."
            INSTALL_SSL="n"
        fi
    fi
    
    echo -e "\n${WHITE}📝 INSTALLATION SUMMARY${NC}"
    echo "=================================="
    echo "Domain: $DOMAIN_NAME"
    echo "Directory: $APP_DIR"
    echo "Port: $APP_PORT"
    echo "Database: $([ "$USE_SQLITE" == "y" ] && echo "SQLite" || echo "Supabase")"
    echo "SSL: $([ "$INSTALL_SSL" == "y" ] && echo "Yes ($ADMIN_EMAIL)" || echo "No")"
    
    echo ""
    question "Proceed with installation? (y/n):"
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        warn "Installation cancelled by user."
        exit 0
    fi
}

install_dependencies() {
    log "Installing system dependencies..."
    
    sudo apt-get update -qq
    
    sudo apt-get install -qq -y \
        curl wget unzip git \
        nginx ufw \
        build-essential \
        software-properties-common
    
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
        log "Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        log "Node.js already installed: $(node -v)"
    fi
    
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2 process manager..."
        sudo npm install -g pm2
    else
        log "PM2 already installed: $(pm2 -v)"
    fi
    
    if [[ "$INSTALL_SSL" == "y" ]]; then
        log "Installing Certbot for SSL..."
        sudo apt-get install -qq -y certbot python3-certbot-nginx
    fi
    
    success "Dependencies installed successfully!"
}

setup_application() {
    log "Setting up application..."
    
    sudo mkdir -p "$APP_DIR"
    sudo chown $(whoami):$(whoami) "$APP_DIR"
    
    log "Downloading helpdesk application..."
    cd /tmp
    
    if git --version &>/dev/null; then
        if git clone "$GITHUB_REPO.git" helpdesk-src 2>/dev/null; then
            cp -r helpdesk-src/* "$APP_DIR/"
            rm -rf helpdesk-src
        else
            wget -q -O app.zip "$GITHUB_REPO/archive/refs/heads/main.zip"
            unzip -q app.zip
            folder=$(ls -d */ | head -1)
            cp -r "$folder"* "$APP_DIR/"
            rm -rf app.zip "$folder"
        fi
    else
        wget -q -O app.zip "$GITHUB_REPO/archive/refs/heads/main.zip"
        unzip -q app.zip
        folder=$(ls -d */ | head -1)
        cp -r "$folder"* "$APP_DIR/"
        rm -rf app.zip "$folder"
    fi
    
    cd "$APP_DIR"
    
    log "Installing application dependencies..."
    npm install --silent --no-audit --no-fund
    
    log "Creating environment configuration..."
    
    if [[ "$USE_SQLITE" == "y" ]]; then
        JWT_SECRET=$(openssl rand -base64 32)
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
    else
        cat > .env <<EOF
# Supabase Configuration (Please update with your credentials)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
NODE_ENV=production

# Application Configuration
PORT=$APP_PORT
DOMAIN_NAME=$DOMAIN_NAME
EOF
        warn "Please update .env file with your Supabase credentials before starting the application."
    fi
    
    log "Building application..."
    npm run build --silent 2>/dev/null || {
        warn "Build failed. Continuing with basic setup..."
    }
    
    success "Application setup completed!"
}

setup_pm2() {
    log "Configuring PM2 process manager..."
    
    cd "$APP_DIR"
    
    if [[ "$USE_SQLITE" == "y" ]]; then
        cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server-sqlite.js',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT,
      USE_SQLITE: 'true',
      SQLITE_PORT: $SQLITE_PORT,
      JWT_SECRET: '$(grep JWT_SECRET .env | cut -d'=' -f2)'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    log_file: '$APP_DIR/logs/combined.log',
    out_file: '$APP_DIR/logs/out.log',
    error_file: '$APP_DIR/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true
  }]
}
EOF
    else
        cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'helpdesk',
    script: 'server.cjs',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: $APP_PORT
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    log_file: '$APP_DIR/logs/combined.log',
    out_file: '$APP_DIR/logs/out.log',
    error_file: '$APP_DIR/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    merge_logs: true
  }]
}
EOF
    fi
    
    if [[ ! -f "server.cjs" ]] && [[ "$USE_SQLITE" != "y" ]]; then
        cat > server.cjs <<'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Helpdesk server running on port ${PORT}`);
});
EOF
    fi
    
    mkdir -p logs
    
    if [[ ! -d "node_modules/express" ]]; then
        npm install express --silent
    fi
    
    success "PM2 configuration completed!"
}

setup_nginx() {
    log "Configuring Nginx web server..."
    
    sudo tee /etc/nginx/sites-available/$DOMAIN_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
$([ "$USE_SQLITE" == "y" ] && cat <<'SQLITEBLOCK'
    
    # SQLite API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle preflight requests
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
SQLITEBLOCK
)
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri @backend;
    }
    
    location @backend {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    sudo nginx -t && sudo systemctl reload nginx
    
    success "Nginx configuration completed!"
}

setup_firewall() {
    log "Configuring firewall..."
    
    sudo ufw --force reset > /dev/null 2>&1
    sudo ufw default deny incoming > /dev/null 2>&1
    sudo ufw default allow outgoing > /dev/null 2>&1
    sudo ufw allow ssh > /dev/null 2>&1
    sudo ufw allow 'Nginx Full' > /dev/null 2>&1
    sudo ufw --force enable > /dev/null 2>&1
    
    success "Firewall configured successfully!"
}

start_application() {
    log "Starting helpdesk application..."
    
    cd "$APP_DIR"
    
    pm2 delete helpdesk 2>/dev/null || true
    
    pm2 start ecosystem.config.js
    pm2 save
    
    pm2 startup systemd -u $(whoami) --hp $HOME > /dev/null 2>&1 || true
    
    success "Application started successfully!"
}

setup_ssl() {
    if [[ "$INSTALL_SSL" == "y" && -n "$ADMIN_EMAIL" ]]; then
        log "Setting up SSL certificate..."
        
        warn "Please ensure your domain $DOMAIN_NAME is pointing to this server's IP address."
        question "Press Enter when DNS is configured correctly..."
        read -r
        
        if sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "$ADMIN_EMAIL" --redirect; then
            success "SSL certificate installed successfully!"
        else
            warn "SSL certificate installation failed. You can retry later with: sudo certbot --nginx -d $DOMAIN_NAME"
        fi
    fi
}

create_scripts() {
    log "Creating management scripts..."
    
    cd "$APP_DIR"
    
    cat > update.sh <<'EOF'
#!/bin/bash
echo "🔄 Updating helpdesk application..."
cd $(dirname $0)
git pull origin main 2>/dev/null || echo "No git repository found"
npm install --silent
npm run build --silent
pm2 restart helpdesk
echo "✅ Update completed!"
EOF
    
    cat > status.sh <<'EOF'
#!/bin/bash
echo "📊 Helpdesk System Status"
echo "=========================="
echo ""
echo "🔄 PM2 Status:"
pm2 list
echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager -l | head -10
echo ""
echo "💾 Disk Usage:"
df -h $(dirname $0)
echo ""
echo "📈 Memory Usage:"
free -h
echo ""
if [ -f "helpdesk.db" ]; then
    echo "🗄️ Database Size:"
    ls -lh helpdesk.db
fi
EOF
    
    if [[ "$USE_SQLITE" == "y" ]]; then
        cat > backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/helpdesk-backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR=$(dirname $0)

mkdir -p "$BACKUP_DIR"

echo "🔄 Creating backup..."
if [ -f "$APP_DIR/helpdesk.db" ]; then
    cp "$APP_DIR/helpdesk.db" "$BACKUP_DIR/helpdesk_$DATE.db"
    echo "✅ Database backup: $BACKUP_DIR/helpdesk_$DATE.db"
else
    echo "⚠️ Database file not found"
fi

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/helpdesk_*.db | tail -n +8 | xargs -r rm
echo "🧹 Cleaned old backups (keeping 7 most recent)"
EOF
    fi
    
    chmod +x *.sh
    
    success "Management scripts created!"
}

show_completion() {
    clear
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║                🎉 INSTALLATION COMPLETE! 🎉             ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    echo -e "${WHITE}📋 INSTALLATION SUMMARY${NC}"
    echo "=================================="
    echo "🌐 URL: http$([ "$INSTALL_SSL" == "y" ] && echo "s")://$DOMAIN_NAME"
    echo "📁 Directory: $APP_DIR"
    echo "🗄️ Database: $([ "$USE_SQLITE" == "y" ] && echo "SQLite (local)" || echo "Supabase (configure .env)")"
    echo "🔐 SSL: $([ "$INSTALL_SSL" == "y" ] && echo "Enabled" || echo "Disabled")"
    echo ""
    
    echo -e "${WHITE}🛠️ MANAGEMENT COMMANDS${NC}"
    echo "=================================="
    echo "📊 Check status: cd $APP_DIR && ./status.sh"
    echo "🔄 Update app: cd $APP_DIR && ./update.sh"
    echo "📝 View logs: pm2 logs helpdesk"
    echo "🔄 Restart: pm2 restart helpdesk"
    echo "⏹️ Stop: pm2 stop helpdesk"
    
    if [[ "$USE_SQLITE" == "y" ]]; then
        echo "💾 Backup DB: cd $APP_DIR && ./backup.sh"
    fi
    
    echo ""
    
    if [[ "$USE_SQLITE" != "y" ]]; then
        echo -e "${YELLOW}⚠️ NEXT STEPS${NC}"
        echo "=================================="
        echo "1. Update Supabase credentials in: $APP_DIR/.env"
        echo "2. Restart the application: pm2 restart helpdesk"
        echo ""
    fi
    
    echo -e "${GREEN}🚀 Your helpdesk is now running at: http$([ "$INSTALL_SSL" == "y" ] && echo "s")://$DOMAIN_NAME${NC}"
    echo ""
}

main() {
    print_banner
    
    echo -e "${WHITE}Starting automated installation...${NC}\n"
    
    check_system
    get_configuration
    
    echo -e "\n${WHITE}🚀 INSTALLING HELPDESK${NC}"
    echo "=================================="
    
    install_dependencies
    setup_application
    setup_pm2
    setup_nginx
    setup_firewall
    start_application
    setup_ssl
    create_scripts
    
    show_completion
}

trap 'echo -e "\n${RED}Installation failed! Check the error above.${NC}"; exit 1' ERR

main "$@"