// Database adapter to switch between Supabase and SQLite
import { supabase } from '@/integrations/supabase/client';
import { sqliteClient } from './sqlite/client';

// Environment configuration
const USE_SQLITE = process.env.NODE_ENV === 'development' && process.env.USE_SQLITE === 'true';

export interface DatabaseAdapter {
  // Auth methods
  auth: {
    signUp(email: string, password: string, options?: any): Promise<any>;
    signIn(email: string, password: string): Promise<any>;
    signOut(): Promise<any>;
    getUser(): Promise<any>;
  };
  
  // Data methods
  from(table: string): TableAdapter;
}

export interface TableAdapter {
  select(columns?: string): TableAdapter;
  insert(data: any): Promise<any>;
  update(data: any): TableAdapter;
  delete(): TableAdapter;
  eq(column: string, value: any): TableAdapter;
  filter(column: string, operator: string, value: any): TableAdapter;
  order(column: string, options?: { ascending?: boolean }): TableAdapter;
  limit(count: number): TableAdapter;
  single(): Promise<any>;
  maybeSingle(): Promise<any>;
}

class SupabaseAdapter implements DatabaseAdapter {
  auth = {
    async signUp(email: string, password: string, options?: any) {
      return supabase.auth.signUp({ email, password, options });
    },
    
    async signIn(email: string, password: string) {
      return supabase.auth.signInWithPassword({ email, password });
    },
    
    async signOut() {
      return supabase.auth.signOut();
    },
    
    async getUser() {
      return supabase.auth.getUser();
    }
  };

  from(table: string): TableAdapter {
    return new SupabaseTableAdapter(supabase.from(table as any));
  }
}

class SupabaseTableAdapter implements TableAdapter {
  constructor(private query: any) {}

  select(columns?: string): TableAdapter {
    return new SupabaseTableAdapter(this.query.select(columns));
  }

  async insert(data: any) {
    return this.query.insert(data);
  }

  update(data: any): TableAdapter {
    return new SupabaseTableAdapter(this.query.update(data));
  }

  delete(): TableAdapter {
    return new SupabaseTableAdapter(this.query.delete());
  }

  eq(column: string, value: any): TableAdapter {
    return new SupabaseTableAdapter(this.query.eq(column, value));
  }

  filter(column: string, operator: string, value: any): TableAdapter {
    return new SupabaseTableAdapter(this.query.filter(column, operator, value));
  }

  order(column: string, options?: { ascending?: boolean }): TableAdapter {
    return new SupabaseTableAdapter(this.query.order(column, options));
  }

  limit(count: number): TableAdapter {
    return new SupabaseTableAdapter(this.query.limit(count));
  }

  async single() {
    return this.query.single();
  }

  async maybeSingle() {
    return this.query.maybeSingle();
  }
}

class SQLiteAdapter implements DatabaseAdapter {
  auth = {
    async signUp(email: string, password: string, options?: any) {
      const organizationName = options?.data?.organizationName;
      const result = await sqliteClient.signUp(email, password, organizationName);
      return { data: result, error: null };
    },
    
    async signIn(email: string, password: string) {
      try {
        const result = await sqliteClient.signIn(email, password);
        return { data: result, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
    
    async signOut() {
      await sqliteClient.signOut();
      return { error: null };
    },
    
    async getUser() {
      try {
        const user = await sqliteClient.getUser();
        return { data: { user }, error: null };
      } catch (error) {
        return { data: { user: null }, error: null };
      }
    }
  };

  from(table: string): TableAdapter {
    return new SQLiteTableAdapter(table);
  }
}

class SQLiteTableAdapter implements TableAdapter {
  private tableName: string;
  private selectColumns?: string;
  private whereConditions: Array<{ column: string; operator: string; value: any }> = [];
  private orderBy?: { column: string; ascending: boolean };
  private limitCount?: number;

  constructor(table: string) {
    this.tableName = table;
  }

  select(columns?: string): TableAdapter {
    this.selectColumns = columns;
    return this;
  }

  async insert(data: any) {
    if (this.tableName === 'tickets') {
      const result = await sqliteClient.createTicket(data);
      return { data: result, error: null };
    } else if (this.tableName === 'contacts') {
      const result = await sqliteClient.createContact(data);
      return { data: result, error: null };
    }
    throw new Error(`Insert not implemented for table: ${this.tableName}`);
  }

  update(data: any): TableAdapter {
    // Store update data for execution
    (this as any).updateData = data;
    return this;
  }

  delete(): TableAdapter {
    (this as any).isDelete = true;
    return this;
  }

  eq(column: string, value: any): TableAdapter {
    this.whereConditions.push({ column, operator: 'eq', value });
    return this;
  }

  filter(column: string, operator: string, value: any): TableAdapter {
    this.whereConditions.push({ column, operator, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): TableAdapter {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): TableAdapter {
    this.limitCount = count;
    return this;
  }

  async single() {
    const result = await this.execute();
    if (result.error) throw new Error(result.error.message);
    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      throw new Error('No data found');
    }
    return { data: Array.isArray(result.data) ? result.data[0] : result.data, error: null };
  }

  async maybeSingle() {
    const result = await this.execute();
    return { 
      data: result.data && Array.isArray(result.data) ? result.data[0] : result.data, 
      error: result.error 
    };
  }

  private async execute() {
    try {
      if (this.tableName === 'tickets') {
        if ((this as any).updateData) {
          const idCondition = this.whereConditions.find(c => c.column === 'id');
          if (idCondition) {
            const result = await sqliteClient.updateTicket(idCondition.value, (this as any).updateData);
            return { data: result, error: null };
          }
        } else if ((this as any).isDelete) {
          const idCondition = this.whereConditions.find(c => c.column === 'id');
          if (idCondition) {
            await sqliteClient.deleteTicket(idCondition.value);
            return { data: null, error: null };
          }
        } else {
          const idCondition = this.whereConditions.find(c => c.column === 'id');
          if (idCondition) {
            const result = await sqliteClient.getTicket(idCondition.value);
            return { data: result, error: null };
          } else {
            const filters: any = {};
            this.whereConditions.forEach(condition => {
              if (condition.operator === 'eq') {
                filters[condition.column] = condition.value;
              }
            });
            const result = await sqliteClient.getTickets(filters);
            return { data: result, error: null };
          }
        }
      } else if (this.tableName === 'contacts') {
        const result = await sqliteClient.getContacts();
        return { data: result, error: null };
      } else if (this.tableName === 'profiles') {
        const result = await sqliteClient.getProfiles();
        return { data: result, error: null };
      } else if (this.tableName === 'organizations') {
        const result = await sqliteClient.getOrganization();
        return { data: result, error: null };
      }
      
      return { data: [], error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message } };
    }
  }
}

// Export the appropriate adapter based on configuration
export const db: DatabaseAdapter = USE_SQLITE ? new SQLiteAdapter() : new SupabaseAdapter();

// Compatibility exports for existing code
export { supabase } from '@/integrations/supabase/client';