import { Ticket } from "@/types/ticket";

export const mockTickets: Ticket[] = [
  {
    id: "1",
    title: "Unable to login to dashboard",
    description: "I'm having trouble logging into my account. When I enter my credentials, I get an error message saying 'Invalid credentials' even though I'm sure my password is correct. I've tried resetting my password but didn't receive the reset email.",
    status: "open",
    priority: "high",
    category: "technical",
    customer: {
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com"
    },
    assignee: {
      name: "Mike Chen",
      email: "mike.chen@helpdesk.com"
    },
    createdAt: new Date("2024-01-15T09:30:00"),
    updatedAt: new Date("2024-01-15T10:15:00"),
    tags: ["login", "authentication", "urgent"]
  },
  {
    id: "2",
    title: "Billing discrepancy on latest invoice",
    description: "I noticed that my latest invoice includes charges for features I haven't subscribed to. Could you please review my account and correct the billing? The invoice number is INV-2024-001.",
    status: "in-progress",
    priority: "medium",
    category: "billing",
    customer: {
      name: "David Rodriguez",
      email: "david.rodriguez@company.com"
    },
    assignee: {
      name: "Emily Watson",
      email: "emily.watson@helpdesk.com"
    },
    createdAt: new Date("2024-01-14T14:20:00"),
    updatedAt: new Date("2024-01-15T08:45:00"),
    tags: ["billing", "invoice", "subscription"]
  },
  {
    id: "3",
    title: "Feature request: Dark mode support",
    description: "It would be great if the application had a dark mode option. Many of us work in low-light environments and the current bright interface can be straining on the eyes during long work sessions.",
    status: "open",
    priority: "low",
    category: "feature-request",
    customer: {
      name: "Alex Thompson",
      email: "alex.thompson@startup.io"
    },
    createdAt: new Date("2024-01-13T16:45:00"),
    updatedAt: new Date("2024-01-13T16:45:00"),
    tags: ["feature-request", "ui", "accessibility"]
  },
  {
    id: "4",
    title: "Data export not working",
    description: "When I try to export my data using the CSV export feature, the download starts but the file appears to be corrupted or incomplete. I've tried multiple times with the same result.",
    status: "resolved",
    priority: "medium",
    category: "technical",
    customer: {
      name: "Lisa Park",
      email: "lisa.park@enterprise.com"
    },
    assignee: {
      name: "James Wilson",
      email: "james.wilson@helpdesk.com"
    },
    createdAt: new Date("2024-01-12T11:30:00"),
    updatedAt: new Date("2024-01-14T15:20:00"),
    tags: ["export", "csv", "data"]
  },
  {
    id: "5",
    title: "General inquiry about API limits",
    description: "I'm planning to integrate with your API and wanted to understand the rate limits and any best practices for handling large volumes of requests. Could you provide documentation or guidance?",
    status: "closed",
    priority: "low",
    category: "general",
    customer: {
      name: "Robert Kim",
      email: "robert.kim@techcorp.com"
    },
    assignee: {
      name: "Sophie Martinez",
      email: "sophie.martinez@helpdesk.com"
    },
    createdAt: new Date("2024-01-10T13:15:00"),
    updatedAt: new Date("2024-01-12T09:30:00"),
    tags: ["api", "documentation", "integration"]
  },
  {
    id: "6",
    title: "Mobile app crashes on startup",
    description: "The mobile application crashes immediately after opening on my Android device (Samsung Galaxy S23). I've tried uninstalling and reinstalling but the issue persists. The app worked fine last week.",
    status: "open",
    priority: "urgent",
    category: "technical",
    customer: {
      name: "Maria Gonzalez",
      email: "maria.gonzalez@freelancer.com"
    },
    createdAt: new Date("2024-01-15T07:20:00"),
    updatedAt: new Date("2024-01-15T07:20:00"),
    tags: ["mobile", "crash", "android", "urgent"]
  }
];