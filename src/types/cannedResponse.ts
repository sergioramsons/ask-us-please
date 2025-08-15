export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  usageCount: number;
}

export type CannedResponseCategory = 
  | 'greeting'
  | 'resolution'
  | 'escalation'
  | 'information'
  | 'closure'
  | 'troubleshooting'
  | 'billing'
  | 'general';