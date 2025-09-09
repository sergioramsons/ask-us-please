import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class SQLiteDatabase {
  private db: Database.Database;
  private static instance: SQLiteDatabase;

  private constructor(dbPath: string = 'helpdesk.db') {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir) && dbDir !== '.') {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initializeTables();
  }

  public static getInstance(dbPath?: string): SQLiteDatabase {
    if (!SQLiteDatabase.instance) {
      SQLiteDatabase.instance = new SQLiteDatabase(dbPath);
    }
    return SQLiteDatabase.instance;
  }

  private initializeTables(): void {
    // Organizations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        subdomain TEXT UNIQUE,
        domain TEXT,
        slug TEXT,
        subscription_status TEXT DEFAULT 'active',
        settings TEXT DEFAULT '{}',
        assignment_settings TEXT DEFAULT '{"method": "round_robin", "default_max_tickets_per_agent": 10, "allow_agent_availability_control": true}',
        max_users INTEGER DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Users table (replaces auth.users)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_confirmed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Profiles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id TEXT REFERENCES organizations(id),
        department_id TEXT,
        first_name TEXT,
        last_name TEXT,
        role TEXT DEFAULT 'agent',
        avatar_url TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Departments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        description TEXT,
        manager_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Contacts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        organization_id TEXT REFERENCES organizations(id),
        company_id TEXT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT,
        first_name TEXT,
        last_name TEXT,
        job_title TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        notes TEXT,
        tags TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tickets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        organization_id TEXT REFERENCES organizations(id),
        ticket_number TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        category TEXT,
        tags TEXT DEFAULT '[]',
        contact_id TEXT REFERENCES contacts(id),
        assigned_to TEXT REFERENCES users(id),
        created_by TEXT REFERENCES users(id),
        department_id TEXT REFERENCES departments(id),
        cc_recipients TEXT DEFAULT '[]',
        required_skills TEXT DEFAULT '[]',
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ticket responses table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_responses (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User roles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL REFERENCES users(id),
        organization_id TEXT REFERENCES organizations(id),
        role TEXT NOT NULL DEFAULT 'agent',
        permissions TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email servers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_servers (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        smtp_host TEXT NOT NULL,
        smtp_port INTEGER DEFAULT 587,
        smtp_username TEXT NOT NULL,
        smtp_password TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        reply_to TEXT,
        use_tls BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT FALSE,
        password_encrypted BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Companies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        postal_code TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tickets_organization ON tickets(organization_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    `);
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }
}

export const getDB = () => SQLiteDatabase.getInstance().getDatabase();