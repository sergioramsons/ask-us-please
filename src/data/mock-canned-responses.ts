import { CannedResponse } from '@/types/cannedResponse';

export const mockCannedResponses: CannedResponse[] = [
  {
    id: '1',
    title: 'Welcome & Acknowledgment',
    content: 'Thank you for contacting our support team. We have received your request and will respond within 24 hours. If this is urgent, please call our emergency line.',
    category: 'greeting',
    isActive: true,
    tags: ['welcome', 'acknowledgment'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'admin',
    usageCount: 45
  },
  {
    id: '2',
    title: 'Password Reset Instructions',
    content: 'To reset your password:\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your email address\n4. Check your email for reset instructions\n\nIf you don\'t receive the email within 10 minutes, please check your spam folder.',
    category: 'troubleshooting',
    isActive: true,
    tags: ['password', 'reset', 'login'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'admin',
    usageCount: 128
  },
  {
    id: '3',
    title: 'Issue Resolved - Follow Up',
    content: 'Great news! Your issue has been resolved. Please test the solution and let us know if everything is working as expected. We\'ll close this ticket in 48 hours if we don\'t hear back from you.',
    category: 'resolution',
    isActive: true,
    tags: ['resolved', 'follow-up'],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    createdBy: 'admin',
    usageCount: 89
  },
  {
    id: '4',
    title: 'Escalation to Level 2',
    content: 'Thank you for your patience. I\'m escalating your ticket to our Level 2 support team who have specialized expertise in this area. They will contact you within 4 business hours.',
    category: 'escalation',
    isActive: true,
    tags: ['escalation', 'level2'],
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04'),
    createdBy: 'admin',
    usageCount: 23
  },
  {
    id: '5',
    title: 'Billing Inquiry Response',
    content: 'Thank you for your billing inquiry. I\'ve reviewed your account and will provide the details below. If you have any questions about these charges, please don\'t hesitate to ask.',
    category: 'billing',
    isActive: true,
    tags: ['billing', 'charges', 'account'],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'admin',
    usageCount: 67
  },
  {
    id: '6',
    title: 'More Information Needed',
    content: 'To better assist you, could you please provide the following information:\n\n• Steps you took before the issue occurred\n• Any error messages you received\n• Your browser and operating system\n• Screenshots if applicable\n\nThis will help us resolve your issue more quickly.',
    category: 'information',
    isActive: true,
    tags: ['information', 'details', 'troubleshooting'],
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-06'),
    createdBy: 'admin',
    usageCount: 156
  },
  {
    id: '7',
    title: 'Ticket Closure',
    content: 'We\'re closing this ticket as resolved. If you experience any related issues or have additional questions, please don\'t hesitate to create a new ticket. Thank you for choosing our service!',
    category: 'closure',
    isActive: true,
    tags: ['closure', 'resolved', 'thanks'],
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-07'),
    createdBy: 'admin',
    usageCount: 234
  },
  {
    id: '8',
    title: 'System Maintenance Notice',
    content: 'We have scheduled maintenance that may affect your service. Maintenance window: [DATE] from [TIME] to [TIME]. We apologize for any inconvenience and appreciate your patience.',
    category: 'information',
    isActive: true,
    tags: ['maintenance', 'downtime', 'notice'],
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08'),
    createdBy: 'admin',
    usageCount: 12
  }
];