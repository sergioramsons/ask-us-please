export interface Contact {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  tags?: string[];
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
  created_by?: string;
  organization_id?: string;
  company_id?: string;
}