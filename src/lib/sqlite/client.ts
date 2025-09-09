// SQLite client for frontend
export class SQLiteClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('sqlite_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth methods
  async signUp(email: string, password: string, organizationName?: string) {
    const result = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, organizationName }),
    });
    
    this.token = result.token;
    localStorage.setItem('sqlite_token', result.token);
    return result;
  }

  async signIn(email: string, password: string) {
    const result = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = result.token;
    localStorage.setItem('sqlite_token', result.token);
    return result;
  }

  async signOut() {
    this.token = null;
    localStorage.removeItem('sqlite_token');
  }

  async getUser() {
    if (!this.token) return null;
    
    try {
      return await this.request('/api/auth/me');
    } catch (error) {
      this.signOut();
      return null;
    }
  }

  // Tickets methods
  async getTickets(filters?: any) {
    return this.request('/api/tickets' + (filters ? `?${new URLSearchParams(filters)}` : ''));
  }

  async getTicket(id: string) {
    return this.request(`/api/tickets/${id}`);
  }

  async createTicket(ticket: any) {
    return this.request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async updateTicket(id: string, updates: any) {
    return this.request(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteTicket(id: string) {
    return this.request(`/api/tickets/${id}`, {
      method: 'DELETE',
    });
  }

  // Contacts methods
  async getContacts() {
    return this.request('/api/contacts');
  }

  async createContact(contact: any) {
    return this.request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  // Organization methods
  async getOrganization() {
    return this.request('/api/organization');
  }

  // Profiles methods
  async getProfiles() {
    return this.request('/api/profiles');
  }
}

// Create a singleton instance
export const sqliteClient = new SQLiteClient();