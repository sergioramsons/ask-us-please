import { Ticket } from "@/types/ticket";

export const mockTickets: Ticket[] = [
  {
    id: "1",
    title: "Unable to login to dashboard",
    description: "I'm having trouble logging into my account. When I enter my credentials, I get an error message saying 'Invalid credentials' even though I'm sure my password is correct. I've tried resetting my password but didn't receive the reset email.",
    status: "open",
    priority: "high",
    severity: "major",
    category: "technical",
    source: "email",
    customer: {
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      company: "Tech Solutions Inc."
    },
    assignee: {
      id: "1",
      name: "Mike Chen",
      email: "mike.chen@helpdesk.com",
      department: "Support"
    },
    createdAt: new Date("2024-01-15T09:30:00"),
    updatedAt: new Date("2024-01-15T10:15:00"),
    firstResponseAt: new Date("2024-01-15T09:45:00"),
    tags: ["login", "authentication", "urgent"],
    watchers: ["user1", "user2"],
    attachments: [],
    comments: [
      {
        id: "c1",
        content: "I've checked the user account and everything seems to be in order. Let me investigate the email delivery issue.",
        author: {
          id: "1",
          name: "Mike Chen",
          email: "mike.chen@helpdesk.com"
        },
        isInternal: true,
        createdAt: new Date("2024-01-15T09:45:00")
      }
    ],
    slaBreached: false,
    escalationLevel: 1,
    customFields: {
      browser: "Chrome 120",
      os: "Windows 11",
      lastLogin: "2024-01-10"
    }
  },
  {
    id: "2",
    title: "Billing discrepancy on latest invoice",
    description: "I noticed that my latest invoice includes charges for features I haven't subscribed to. Could you please review my account and correct the billing? The invoice number is INV-2024-001.",
    status: "in-progress",
    priority: "medium",
    severity: "minor",
    category: "billing",
    source: "portal",
    customer: {
      name: "David Rodriguez",
      email: "david.rodriguez@company.com",
      company: "Rodriguez Enterprises"
    },
    assignee: {
      id: "2",
      name: "Emily Watson",
      email: "emily.watson@helpdesk.com",
      department: "Billing"
    },
    createdAt: new Date("2024-01-14T14:20:00"),
    updatedAt: new Date("2024-01-15T08:45:00"),
    firstResponseAt: new Date("2024-01-14T15:00:00"),
    tags: ["billing", "invoice", "subscription"],
    watchers: ["user3"],
    attachments: [],
    comments: [],
    slaBreached: false,
    escalationLevel: 0,
    customFields: {
      invoiceNumber: "INV-2024-001",
      subscriptionTier: "Premium"
    }
  },
  {
    id: "3",
    title: "Feature request: Dark mode support",
    description: "It would be great if the application had a dark mode option. Many of us work in low-light environments and the current bright interface can be straining on the eyes during long work sessions.",
    status: "open",
    priority: "low",
    severity: "minimal",
    category: "feature-request",
    source: "chat",
    customer: {
      name: "Alex Thompson",
      email: "alex.thompson@startup.io",
      company: "Startup IO"
    },
    createdAt: new Date("2024-01-13T16:45:00"),
    updatedAt: new Date("2024-01-13T16:45:00"),
    tags: ["feature-request", "ui", "accessibility"],
    watchers: [],
    attachments: [],
    comments: [],
    slaBreached: false,
    escalationLevel: 0,
    customFields: {
      featureType: "UI Enhancement",
      votes: "15"
    }
  },
  {
    id: "4",
    title: "Data export not working",
    description: "When I try to export my data using the CSV export feature, the download starts but the file appears to be corrupted or incomplete. I've tried multiple times with the same result.",
    status: "resolved",
    priority: "medium",
    severity: "minor",
    category: "technical",
    source: "phone",
    customer: {
      name: "Lisa Park",
      email: "lisa.park@enterprise.com",
      company: "Enterprise Corp",
      department: "Data Analytics"
    },
    assignee: {
      id: "3",
      name: "James Wilson",
      email: "james.wilson@helpdesk.com",
      department: "Technical Support"
    },
    createdAt: new Date("2024-01-12T11:30:00"),
    updatedAt: new Date("2024-01-14T15:20:00"),
    firstResponseAt: new Date("2024-01-12T12:00:00"),
    resolvedAt: new Date("2024-01-14T15:20:00"),
    tags: ["export", "csv", "data"],
    watchers: ["user4"],
    attachments: [],
    comments: [],
    resolution: {
      resolvedAt: new Date("2024-01-14T15:20:00"),
      resolvedBy: "James Wilson",
      resolutionNotes: "Fixed the CSV export encoding issue. The problem was with UTF-8 character handling in large datasets.",
      resolutionTime: 2950,
      customerSatisfaction: {
        rating: 5,
        feedback: "Quick and effective resolution!"
      }
    },
    slaBreached: false,
    escalationLevel: 0,
    customFields: {
      exportSize: "2.5MB",
      format: "CSV",
      recordCount: "10,000"
    }
  },
  {
    id: "5",
    title: "General inquiry about API limits",
    description: "I'm planning to integrate with your API and wanted to understand the rate limits and any best practices for handling large volumes of requests. Could you provide documentation or guidance?",
    status: "closed",
    priority: "low",
    severity: "minimal",
    category: "general",
    source: "api",
    customer: {
      name: "Robert Kim",
      email: "robert.kim@techcorp.com",
      company: "TechCorp Solutions"
    },
    assignee: {
      id: "4",
      name: "Sophie Martinez",
      email: "sophie.martinez@helpdesk.com",
      department: "Developer Relations"
    },
    createdAt: new Date("2024-01-10T13:15:00"),
    updatedAt: new Date("2024-01-12T09:30:00"),
    firstResponseAt: new Date("2024-01-10T14:00:00"),
    resolvedAt: new Date("2024-01-11T16:30:00"),
    closedAt: new Date("2024-01-12T09:30:00"),
    tags: ["api", "documentation", "integration"],
    watchers: [],
    attachments: [],
    comments: [],
    resolution: {
      resolvedAt: new Date("2024-01-11T16:30:00"),
      resolvedBy: "Sophie Martinez",
      resolutionNotes: "Provided comprehensive API documentation and best practices guide. Also shared sample code for handling rate limits.",
      resolutionTime: 1575,
      customerSatisfaction: {
        rating: 4,
        feedback: "Very helpful documentation!"
      }
    },
    slaBreached: false,
    escalationLevel: 0,
    customFields: {
      apiVersion: "v2",
      integrationType: "REST"
    }
  },
  {
    id: "6",
    title: "Mobile app crashes on startup",
    description: "The mobile application crashes immediately after opening on my Android device (Samsung Galaxy S23). I've tried uninstalling and reinstalling but the issue persists. The app worked fine last week.",
    status: "open",
    priority: "urgent",
    severity: "critical",
    category: "bug",
    source: "walk-in",
    customer: {
      name: "Maria Gonzalez",
      email: "maria.gonzalez@freelancer.com",
      phone: "+1 (555) 987-6543"
    },
    createdAt: new Date("2024-01-15T07:20:00"),
    updatedAt: new Date("2024-01-15T07:20:00"),
    dueDate: new Date("2024-01-16T17:00:00"),
    tags: ["mobile", "crash", "android", "urgent"],
    watchers: ["user1", "user5"],
    attachments: [],
    comments: [],
    slaBreached: true,
    escalationLevel: 2,
    customFields: {
      device: "Samsung Galaxy S23",
      osVersion: "Android 14",
      appVersion: "3.2.1",
      crashReports: "Available"
    }
  }
];