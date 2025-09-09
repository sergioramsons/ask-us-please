import { getDB } from './database';

export interface Ticket {
  id: string;
  organization_id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  contact_id?: string;
  assigned_to?: string;
  created_by?: string;
  department_id?: string;
  cc_recipients?: any[];
  required_skills?: string[];
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  organization_id?: string;
  company_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  tags?: string[];
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export class TicketModel {
  static getAll(organizationId: string, filters?: any): Ticket[] {
    const db = getDB();
    let query = `
      SELECT t.*, c.name as contact_name, p.first_name || ' ' || p.last_name as assigned_name
      FROM tickets t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN profiles p ON t.assigned_to = p.user_id
      WHERE t.organization_id = ?
    `;
    
    const params: any[] = [organizationId];
    
    if (filters?.status) {
      query += ' AND t.status = ?';
      params.push(filters.status);
    }
    
    if (filters?.assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(filters.assigned_to);
    }
    
    if (filters?.priority) {
      query += ' AND t.priority = ?';
      params.push(filters.priority);
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const tickets = db.prepare(query).all(...params) as any[];
    return tickets.map(ticket => ({
      ...ticket,
      tags: JSON.parse(ticket.tags || '[]'),
      cc_recipients: JSON.parse(ticket.cc_recipients || '[]'),
      required_skills: JSON.parse(ticket.required_skills || '[]')
    }));
  }

  static getById(id: string, organizationId: string): Ticket | null {
    const db = getDB();
    const ticket = db.prepare(`
      SELECT t.*, c.name as contact_name, c.email as contact_email,
             p.first_name || ' ' || p.last_name as assigned_name
      FROM tickets t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN profiles p ON t.assigned_to = p.user_id
      WHERE t.id = ? AND t.organization_id = ?
    `).get(id, organizationId) as any;
    
    if (!ticket) return null;
    
    return {
      ...ticket,
      tags: JSON.parse(ticket.tags || '[]'),
      cc_recipients: JSON.parse(ticket.cc_recipients || '[]'),
      required_skills: JSON.parse(ticket.required_skills || '[]')
    };
  }

  static create(ticket: Partial<Ticket>): Ticket {
    const db = getDB();
    const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ticketNumber = `T-${Date.now()}`;
    
    const insertTicket = db.prepare(`
      INSERT INTO tickets (
        id, organization_id, ticket_number, subject, description, status, priority,
        category, tags, contact_id, assigned_to, created_by, department_id,
        cc_recipients, required_skills
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertTicket.run(
      id,
      ticket.organization_id,
      ticketNumber,
      ticket.subject,
      ticket.description || '',
      ticket.status || 'open',
      ticket.priority || 'medium',
      ticket.category || '',
      JSON.stringify(ticket.tags || []),
      ticket.contact_id,
      ticket.assigned_to,
      ticket.created_by,
      ticket.department_id,
      JSON.stringify(ticket.cc_recipients || []),
      JSON.stringify(ticket.required_skills || [])
    );
    
    return this.getById(id, ticket.organization_id!)!;
  }

  static update(id: string, organizationId: string, updates: Partial<Ticket>): Ticket {
    const db = getDB();
    
    const setParts: string[] = [];
    const params: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'ticket_number') {
        setParts.push(`${key} = ?`);
        if (key === 'tags' || key === 'cc_recipients' || key === 'required_skills') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
      }
    });
    
    if (setParts.length === 0) return this.getById(id, organizationId)!;
    
    setParts.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id, organizationId);
    
    const updateQuery = `
      UPDATE tickets 
      SET ${setParts.join(', ')} 
      WHERE id = ? AND organization_id = ?
    `;
    
    db.prepare(updateQuery).run(...params);
    return this.getById(id, organizationId)!;
  }

  static delete(id: string, organizationId: string): boolean {
    const db = getDB();
    const result = db.prepare('DELETE FROM tickets WHERE id = ? AND organization_id = ?').run(id, organizationId);
    return result.changes > 0;
  }
}

export class ContactModel {
  static getAll(organizationId: string): Contact[] {
    const db = getDB();
    const contacts = db.prepare(`
      SELECT * FROM contacts 
      WHERE organization_id = ? OR organization_id IS NULL
      ORDER BY created_at DESC
    `).all(organizationId) as any[];
    
    return contacts.map(contact => ({
      ...contact,
      tags: JSON.parse(contact.tags || '[]')
    }));
  }

  static getById(id: string): Contact | null {
    const db = getDB();
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
    if (!contact) return null;
    
    return {
      ...contact,
      tags: JSON.parse(contact.tags || '[]')
    };
  }

  static create(contact: Partial<Contact>): Contact {
    const db = getDB();
    const id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const insertContact = db.prepare(`
      INSERT INTO contacts (
        id, organization_id, company_id, name, email, phone, company,
        first_name, last_name, job_title, address, city, state,
        postal_code, country, notes, tags, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertContact.run(
      id,
      contact.organization_id,
      contact.company_id,
      contact.name,
      contact.email,
      contact.phone,
      contact.company,
      contact.first_name,
      contact.last_name,
      contact.job_title,
      contact.address,
      contact.city,
      contact.state,
      contact.postal_code,
      contact.country,
      contact.notes,
      JSON.stringify(contact.tags || []),
      contact.status || 'active',
      contact.created_by
    );
    
    return this.getById(id)!;
  }

  static searchByEmail(email: string): Contact | null {
    const db = getDB();
    const contact = db.prepare('SELECT * FROM contacts WHERE LOWER(email) = LOWER(?)').get(email) as any;
    if (!contact) return null;
    
    return {
      ...contact,
      tags: JSON.parse(contact.tags || '[]')
    };
  }
}

export class OrganizationModel {
  static getById(id: string) {
    const db = getDB();
    return db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
  }

  static getBySubdomain(subdomain: string) {
    const db = getDB();
    return db.prepare('SELECT * FROM organizations WHERE subdomain = ?').get(subdomain);
  }
}

export class ProfileModel {
  static getByUserId(userId: string) {
    const db = getDB();
    return db.prepare(`
      SELECT p.*, o.name as organization_name
      FROM profiles p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.user_id = ?
    `).get(userId);
  }

  static getAllByOrganization(organizationId: string) {
    const db = getDB();
    return db.prepare(`
      SELECT p.*, u.email
      FROM profiles p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.organization_id = ?
    `).all(organizationId);
  }
}