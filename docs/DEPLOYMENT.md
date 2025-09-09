# Deployment Options

This helpdesk application supports two deployment modes:

## 1. Cloud Deployment (Supabase)
- **Best for**: SaaS applications, teams wanting managed infrastructure
- **Database**: PostgreSQL (managed by Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Built-in real-time subscriptions

### Deploy to Vercel/Netlify
```bash
# Build for production
npm run build

# Deploy to Vercel
npx vercel --prod

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## 2. VPS Deployment (SQLite)
- **Best for**: Self-hosted solutions, small to medium teams
- **Database**: SQLite (file-based)
- **Authentication**: JWT-based
- **File Storage**: Local filesystem
- **Real-time**: REST API polling

### One-Line VPS Installation
```bash
curl -sSL https://raw.githubusercontent.com/your-repo/main/vps-installer.sh | DOMAIN_NAME=your.domain bash
```

### Manual VPS Setup
1. **Prepare your server** (Ubuntu/Debian recommended)
2. **Install dependencies**:
   ```bash
   sudo apt update
   sudo apt install nodejs npm nginx certbot python3-certbot-nginx
   npm install -g pm2
   ```
3. **Clone and setup**:
   ```bash
   git clone https://github.com/your-repo/helpdesk.git
   cd helpdesk
   npm install
   echo "USE_SQLITE=true" > .env
   npm run build
   ```
4. **Start with PM2**:
   ```bash
   pm2 start server-sqlite.js --name helpdesk
   pm2 save
   pm2 startup
   ```

## Comparison

| Feature | Cloud (Supabase) | VPS (SQLite) |
|---------|------------------|--------------|
| **Setup Time** | 5 minutes | 15 minutes |
| **Monthly Cost** | $0-25+ | VPS cost only |
| **Scalability** | Automatic | Manual scaling |
| **Maintenance** | Managed | Self-managed |
| **Data Control** | Supabase servers | Your server |
| **Backups** | Automatic | Manual setup |
| **SSL/HTTPS** | Automatic | Certbot setup |

## Migration Between Modes

### From Supabase to SQLite
1. Export data from Supabase
2. Set up SQLite environment
3. Import data to SQLite
4. Update configuration

### From SQLite to Supabase
1. Create Supabase project
2. Set up database schema
3. Export SQLite data
4. Import to Supabase
5. Update configuration

## Performance Guidelines

### SQLite Mode Limits
- **Concurrent Users**: < 1000
- **Database Size**: < 100GB
- **Read Operations**: Excellent
- **Write Operations**: Good for most use cases

### When to Choose Each

**Choose Supabase when**:
- You need automatic scaling
- You want managed backups
- You need real-time features
- Team > 50 users

**Choose SQLite when**:
- You want full control
- Cost is a primary concern
- Simple deployment preferred
- Team < 50 users

## Security Considerations

### Both Modes
- Always use HTTPS in production
- Regularly update dependencies
- Use strong passwords
- Enable firewall protection

### SQLite Specific
- Secure file permissions on database
- Regular manual backups
- Monitor disk usage
- Implement log rotation

### Supabase Specific
- Configure Row Level Security
- Review API access patterns
- Monitor usage quotas
- Set up email notifications