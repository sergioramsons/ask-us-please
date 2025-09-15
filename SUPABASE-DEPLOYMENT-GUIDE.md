# Supabase Multi-Client Deployment Guide

## Overview

This helpdesk application is built with Supabase as the primary backend. For multi-client deployments, each client gets their own Supabase project and frontend deployment, ensuring complete data isolation and customization.

## Deployment Architecture

```
Client A → Supabase Project A → Frontend Deployment A
Client B → Supabase Project B → Frontend Deployment B
Client C → Supabase Project C → Frontend Deployment C
```

## Prerequisites

- Node.js 18+ 
- VPS or cloud server with Ubuntu/Debian
- Domain name for each client
- Supabase account

## Step-by-Step Deployment Process

### 1. Create Supabase Project for Each Client

For each new client:

1. **Create New Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project: `helpdesk-[client-name]`
   - Note the Project URL and anon key

2. **Set up Database Schema**
   - Use the SQL Editor to run the migration scripts
   - Copy the schema from an existing working project
   - Set up Row Level Security (RLS) policies

3. **Configure Authentication**
   - Enable email authentication
   - Set up redirect URLs
   - Configure email templates if needed

### 2. Deploy Frontend for Each Client

Use the provided installer script:

```bash
# Download the installer
curl -O https://raw.githubusercontent.com/your-repo/supabase-client-installer.sh

# Make it executable
chmod +x supabase-client-installer.sh

# Run for each client
bash supabase-client-installer.sh client-name domain.com
```

### 3. Configuration Examples

#### Client 1: ACME Corp
```bash
bash supabase-client-installer.sh acme-corp helpdesk.acmecorp.com
```

#### Client 2: TechStart Inc
```bash
bash supabase-client-installer.sh techstart support.techstart.io
```

## Supabase Setup Checklist

For each client's Supabase project:

### Database Schema
- [ ] Organizations table
- [ ] Profiles table  
- [ ] Tickets table
- [ ] Departments table
- [ ] User roles table
- [ ] All supporting tables

### Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Set up organization-based policies
- [ ] Test data isolation between organizations

### Authentication
- [ ] Enable email/password auth
- [ ] Configure redirect URLs
- [ ] Set up email templates (optional)

### Edge Functions (if needed)
- [ ] Deploy email processing functions
- [ ] Set up any integrations (SMS, 3CX, etc.)
- [ ] Configure function secrets

## Environment Configuration

Each client deployment needs these environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Client Configuration  
CLIENT_NAME=[client-name]
ORGANIZATION_NAME=[client-display-name]
DOMAIN=[client-domain]
```

## Advantages of Supabase Multi-Client Architecture

### ✅ Complete Data Isolation
- Each client has their own database
- No risk of data leaking between clients
- Independent scaling per client

### ✅ Customization Per Client
- Custom branding per deployment
- Client-specific features
- Independent update cycles

### ✅ Built-in Security
- Row Level Security (RLS)
- Authentication handled by Supabase
- Automatic SSL/TLS

### ✅ Scalability
- Auto-scaling database
- Global CDN for frontend
- Minimal server maintenance

## Cost Structure

### Supabase Costs (per client)
- **Free Tier**: Up to 50,000 monthly active users
- **Pro Tier**: $25/month for larger deployments
- **Team Tier**: $599/month for enterprise features

### Infrastructure Costs (per client)
- **VPS**: $5-20/month (depending on traffic)
- **Domain**: $10-15/year
- **SSL Certificate**: Free (Let's Encrypt)

## Management & Monitoring

### Per-Client Management Scripts
```bash
# Start client services
helpdesk-[client-name] start

# Check client status  
helpdesk-[client-name] status

# View client logs
helpdesk-[client-name] logs

# Update client application
helpdesk-[client-name] update
```

### Monitoring Dashboard
- Supabase provides built-in analytics
- Application health checks at `/health`
- PM2 process monitoring
- Nginx access logs

## Backup & Recovery

### Automatic Backups
- Supabase handles database backups automatically
- Point-in-time recovery available
- Frontend deployments are stateless

### Manual Backups
```bash
# Database backup (via Supabase CLI)
supabase db dump --project-ref [project-id] > backup.sql

# Application backup
tar -czf client-backup.tar.gz /var/www/[client-name]/
```

## Security Best Practices

### Database Security
- ✅ RLS enabled on all tables
- ✅ Organization-based data isolation
- ✅ Secure API keys management
- ✅ Regular security updates

### Infrastructure Security
- ✅ Firewall configuration (UFW)
- ✅ SSL certificates for all domains
- ✅ Regular system updates
- ✅ Non-root user deployment

## Troubleshooting Common Issues

### Connection Issues
```bash
# Check application status
helpdesk-[client-name] status

# Check Supabase connectivity
curl -H "apikey: [anon-key]" [supabase-url]/rest/v1/

# Check Nginx configuration
sudo nginx -t
```

### Performance Issues
```bash
# Monitor PM2 processes
pm2 monit

# Check system resources
htop

# Review application logs
helpdesk-[client-name] logs
```

## Migration from SQLite to Supabase

If you have existing SQLite deployments:

1. **Export existing data**
2. **Create new Supabase project**
3. **Set up schema in Supabase**
4. **Import data to Supabase**
5. **Deploy new frontend with Supabase config**
6. **Test thoroughly before switching domains**

## Support & Updates

### Updating All Clients
```bash
# Create update script for all clients
for client in acme-corp techstart; do
  helpdesk-$client update
done
```

### Monitoring All Deployments
```bash
# Health check all clients
for client in acme-corp techstart; do
  echo "Checking $client..."
  helpdesk-$client status
done
```

## Conclusion

The Supabase-based architecture provides:
- Better security through data isolation
- Easier maintenance and updates  
- Built-in scalability and reliability
- Professional authentication and authorization
- Comprehensive monitoring and analytics

This approach is recommended for production deployments with multiple clients, as it provides enterprise-grade security and scalability while maintaining cost-effectiveness.