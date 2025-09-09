# SQLite Mode Installation Guide

This guide explains how to install and run the helpdesk application with SQLite instead of Supabase for VPS deployment.

## Quick Installation

### One-line VPS Installation

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/main/vps-installer.sh | DOMAIN_NAME=your.domain bash
```

This will:
- Install all dependencies (Node.js, PM2, Nginx, etc.)
- Download and build the application
- Configure SQLite as the database
- Set up Nginx reverse proxy
- Configure SSL (optional)
- Start the application with PM2

## Manual Installation

### Prerequisites

- Ubuntu/Debian VPS
- Node.js 18+
- PM2 (for process management)
- Nginx (for reverse proxy)

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/helpdesk.git
   cd helpdesk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cat > .env <<EOF
   USE_SQLITE=true
   SQLITE_PORT=3001
   JWT_SECRET=$(openssl rand -base64 32)
   NODE_ENV=production
   PORT=3000
   EOF
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start SQLite server**
   ```bash
   # Development mode
   npm run dev:sqlite

   # Production mode with PM2
   pm2 start ecosystem.config.js
   ```

## Architecture

### SQLite Mode Components

- **Main App Server** (Port 3000): Serves the React frontend
- **SQLite API Server** (Port 3001): Provides REST API endpoints
- **SQLite Database**: Local file-based database (`helpdesk.db`)

### Database Schema

The SQLite schema mirrors the Supabase schema with these main tables:
- `users` - User authentication
- `organizations` - Multi-tenant organizations
- `profiles` - User profiles and roles
- `tickets` - Help desk tickets
- `contacts` - Customer contacts
- `departments` - Organization departments
- `companies` - Customer companies

### Authentication

- Local JWT-based authentication
- bcrypt password hashing
- Role-based access control
- Organization-level isolation

## Configuration

### Environment Variables

```bash
USE_SQLITE=true          # Enable SQLite mode
SQLITE_PORT=3001         # SQLite API server port
JWT_SECRET=your-secret   # JWT signing secret
NODE_ENV=production      # Environment mode
PORT=3000               # Main app port
```

### Database Configuration

The SQLite database is automatically created on first run. Default location: `./helpdesk.db`

To change the database location:
```javascript
// In your startup script
const db = SQLiteDatabase.getInstance('/custom/path/to/helpdesk.db');
```

## API Endpoints

The SQLite mode provides REST API endpoints that mirror Supabase functionality:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Tickets
- `GET /api/tickets` - List tickets
- `GET /api/tickets/:id` - Get ticket
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact

### Organizations
- `GET /api/organization` - Get organization
- `GET /api/profiles` - List organization profiles

## Development

### Running in Development

```bash
# Terminal 1: Start SQLite API server
npm run dev:sqlite-server

# Terminal 2: Start React dev server
USE_SQLITE=true npm run dev
```

### Database Adapter

The application uses a database adapter pattern to switch between Supabase and SQLite:

```javascript
import { db } from '@/lib/database-adapter';

// Works with both Supabase and SQLite
const tickets = await db.from('tickets')
  .select('*')
  .eq('status', 'open');
```

## Deployment

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'helpdesk-sqlite',
    script: 'server-sqlite.js',
    env: {
      USE_SQLITE: 'true',
      NODE_ENV: 'production',
      PORT: 3000,
      SQLITE_PORT: 3001
    }
  }]
}
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your.domain;
    
    # Main app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Database Backup & Restore

### Backup
```bash
# Simple file copy
cp helpdesk.db helpdesk-backup-$(date +%Y%m%d).db

# SQLite dump
sqlite3 helpdesk.db ".backup helpdesk-backup.db"
```

### Restore
```bash
# Restore from backup
cp helpdesk-backup.db helpdesk.db

# Import SQL dump
sqlite3 helpdesk.db < backup.sql
```

## Migration from Supabase

To migrate from Supabase to SQLite:

1. **Export Supabase data**
   ```sql
   -- Export each table as CSV or SQL
   COPY (SELECT * FROM tickets) TO 'tickets.csv' WITH CSV HEADER;
   ```

2. **Import to SQLite**
   ```bash
   # Convert and import data
   sqlite3 helpdesk.db ".mode csv" ".import tickets.csv tickets"
   ```

3. **Update configuration**
   ```bash
   # Switch to SQLite mode
   echo "USE_SQLITE=true" >> .env
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   - Change SQLITE_PORT in .env
   - Update Nginx configuration

2. **Database permission errors**
   - Check file permissions: `chmod 644 helpdesk.db`
   - Verify directory permissions

3. **JWT authentication issues**
   - Regenerate JWT_SECRET
   - Clear browser storage

### Logs

```bash
# PM2 logs
pm2 logs helpdesk-sqlite

# Application logs
tail -f logs/combined.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Performance Considerations

- SQLite is suitable for small to medium deployments (< 1000 concurrent users)
- For high-traffic applications, consider PostgreSQL
- Enable WAL mode for better concurrent read performance
- Regular database maintenance with VACUUM

## Security

- JWT tokens expire in 24 hours
- Passwords are hashed with bcrypt
- SQL injection prevention through prepared statements
- Organization-level data isolation
- HTTPS/SSL recommended for production

## Support

For issues and questions:
- Check the logs first
- Review the troubleshooting section
- Open an issue on GitHub
- Contact support team