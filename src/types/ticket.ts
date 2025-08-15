export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'technical' | 'billing' | 'general' | 'feature-request';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customer: {
    name: string;
    email: string;
  };
  assignee?: {
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}