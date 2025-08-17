export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'technical' | 'billing' | 'general' | 'feature-request' | 'bug' | 'training' | 'hardware' | 'software';
export type TicketSeverity = 'minimal' | 'minor' | 'major' | 'critical';
export type TicketSource = 'email' | 'phone' | 'chat' | 'portal' | 'api' | 'walk-in';

export interface TicketCustomer {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  department?: string;
}

export interface TicketAssignee {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export interface TicketAttachment {
  id: string;
  filename: string;
  filesize: number;
  contentType: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface TicketComment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  isInternal: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TicketResolution {
  resolvedAt: Date;
  resolvedBy: string;
  resolutionNotes: string;
  resolutionTime: number; // in minutes
  customerSatisfaction?: {
    rating: number; // 1-5
    feedback?: string;
  };
}

export interface Ticket {
  id: string;
  ticketNumber?: string; // Optional ticket number field
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  severity: TicketSeverity;
  category: TicketCategory;
  source: TicketSource;
  
  // Customer information
  customer: TicketCustomer;
  
  // Assignment
  assignee?: TicketAssignee;
  department?: string;
  
  // Timing
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  
  // Additional fields
  tags: string[];
  watchers: string[]; // User IDs watching this ticket
  attachments: TicketAttachment[];
  comments: TicketComment[];
  resolution?: TicketResolution;
  
  // SLA tracking
  slaBreached: boolean;
  escalationLevel: number; // 0 = no escalation, 1+ = escalation levels
  
  // Integration
  freshdeskId?: number;
  externalId?: string;
  
  // Custom fields
  customFields: Record<string, any>;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}