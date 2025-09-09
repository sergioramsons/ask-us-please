import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export interface User {
  id: string;
  email: string;
  email_confirmed: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class AuthService {
  static async register(email: string, password: string, organizationName?: string): Promise<AuthResponse> {
    const db = getDB();
    
    // Check if user already exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, email_confirmed)
      VALUES (?, ?, ?, ?)
    `);
    
    insertUser.run(userId, email, passwordHash, true);
    
    // Create organization if provided
    let organizationId: string | null = null;
    if (organizationName) {
      organizationId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const insertOrg = db.prepare(`
        INSERT INTO organizations (id, name)
        VALUES (?, ?)
      `);
      insertOrg.run(organizationId, organizationName);
    }

    // Create profile
    const profileId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertProfile = db.prepare(`
      INSERT INTO profiles (id, user_id, organization_id, role)
      VALUES (?, ?, ?, ?)
    `);
    insertProfile.run(profileId, userId, organizationId, organizationName ? 'admin' : 'agent');

    // Create user role
    if (organizationId) {
      const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const insertRole = db.prepare(`
        INSERT INTO user_roles (id, user_id, organization_id, role)
        VALUES (?, ?, ?, ?)
      `);
      insertRole.run(roleId, userId, organizationId, 'admin');
    }

    const user: User = {
      id: userId,
      email,
      email_confirmed: true,
      created_at: new Date().toISOString()
    };

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' });

    return { user, token };
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const db = getDB();
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    return {
      user: {
        id: user.id,
        email: user.email,
        email_confirmed: user.email_confirmed,
        created_at: user.created_at
      },
      token
    };
  }

  static async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = getDB();
      
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        email_confirmed: user.email_confirmed,
        created_at: user.created_at
      };
    } catch (error) {
      return null;
    }
  }

  static async getCurrentUser(token: string) {
    const user = await this.verifyToken(token);
    if (!user) return null;

    const db = getDB();
    const profile = db.prepare(`
      SELECT p.*, o.name as organization_name 
      FROM profiles p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.user_id = ?
    `).get(user.id);

    return {
      ...user,
      profile
    };
  }
}