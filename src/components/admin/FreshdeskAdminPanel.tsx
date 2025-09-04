import { useState } from "react";
import { 
  Users, 
  Mail, 
  MessageSquare, 
  Phone, 
  Building2, 
  User, 
  Inbox,
  Search,
  ChevronDown,
  Facebook,
  Workflow,
  Cog,
  BarChart3,
  Clock,
  Globe,
  Headphones,
  MessageCircle,
  FileText,
  Settings,
  Bell,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Import existing components for when user clicks on cards
import { UserRoleManager } from "./UserRoleManager";
import { BusinessHoursConfig } from "./BusinessHoursConfig";
import IncomingMailServerConfig from "./IncomingMailServerConfig";
import { ChannelManager } from "@/components/channels/ChannelManager";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { ContactsManager } from "./ContactsManager";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Ticket } from "@/types/ticket";

interface AdminPanelProps {
  tickets: Ticket[];
  onCreateTicket?: (ticketData: any) => void;
}

interface AdminCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  configured: boolean;
  component?: React.ComponentType<any>;
}

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  totalCards: number;
  configuredCards: number;
  cards: AdminCard[];
}

interface SidebarItem {
  id: string;
  title: string;
  description: string;
  icon: any;
}

export function FreshdeskAdminPanel({ tickets, onCreateTicket }: AdminPanelProps) {
  const { isSuperAdmin } = useOrganization();
  const [activeSection, setActiveSection] = useState<string>("team");
  const [activeCard, setActiveCard] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const sidebarItems: SidebarItem[] = [
    {
      id: "team",
      title: "Team",
      description: "Define agents' access levels and working hours",
      icon: Users,
    },
    {
      id: "channels",
      title: "Channels", 
      description: "Bring in customer queries from various sources",
      icon: Inbox,
    },
    {
      id: "workflows",
      title: "Workflows",
      description: "Set up your ticket routing and resolution process", 
      icon: Workflow,
    },
    {
      id: "agent-productivity",
      title: "Agent Productivity",
      description: "Pre-create responses and actions for reuse",
      icon: BarChart3,
    },
    {
      id: "support-operations", 
      title: "Support Operations",
      description: "Map out and manage your complete support structure",
      icon: Cog,
    },
    {
      id: "account",
      title: "Account",
      description: "Manage your billing and account information",
      icon: User,
    },
  ];

  const adminSections: AdminSection[] = [
    {
      id: "team",
      title: "Team",
      description: "Manage your team members and their settings",
      icon: Users,
      totalCards: 3,
      configuredCards: 3,
      cards: [
        {
          id: "agents",
          title: "Agents",
          description: "Define agents' scope of work, type, language, and other details.",
          icon: Users,
          configured: true,
          component: UserRoleManager,
        },
        {
          id: "groups", 
          title: "Groups",
          description: "Organize agents and receive notifications on unattended tickets.",
          icon: Users,
          configured: true,
        },
        {
          id: "business-hours",
          title: "Business Hours", 
          description: "Define working hours and holidays to set expectations with customers",
          icon: Clock,
          configured: true,
          component: BusinessHoursConfig,
        },
      ]
    },
    {
      id: "channels",
      title: "Channels", 
      description: "Configure how customers can reach you",
      icon: Inbox,
      totalCards: 8,
      configuredCards: 7,
      cards: [
        {
          id: "portals",
          title: "Portals",
          description: "Customize the branding, visibility, and structure of your self-service portal",
          icon: Globe,
          configured: true,
        },
        {
          id: "email",
          title: "Email",
          description: "Integrate support mailboxes, configure DKIM, custom mail servers, POP3/IMAP, Bcc and more",
          icon: Mail,
          configured: true,
          component: IncomingMailServerConfig,
        },
        {
          id: "widgets",
          title: "Widgets", 
          description: "Embed help articles or a contact form on your website or product",
          icon: MessageSquare,
          configured: true,
        },
        {
          id: "facebook",
          title: "Facebook",
          description: "Associate your Facebook page to pull in customer posts, comments, and messages as tickets",
          icon: Facebook,
          configured: false,
        },
        {
          id: "phone",
          title: "Phone",
          description: "Run a virtual call center and manage phone conversations with Freshcaller",
          icon: Phone,
          configured: true,
        },
        {
          id: "chat",
          title: "Chat",
          description: "Offer instantaneous support on your website or app with Freshchat",
          icon: MessageCircle,
          configured: true,
        },
        {
          id: "feedback-form",
          title: "Feedback Form",
          description: "Embed your ticket form as a widget to receive customer feedback",
          icon: FileText,
          configured: true,
        },
        {
          id: "whatsapp",
          title: "WhatsApp",
          description: "Integrate your WhatsApp business number to support customers and offer instant resolutions",
          icon: MessageSquare,
          configured: true,
        },
      ]
    },
  ];

  // Add organizations section only for super admins
  if (isSuperAdmin) {
    sidebarItems.unshift({
      id: "organizations",
      title: "Organizations", 
      description: "Manage multiple organizations and tenants",
      icon: Building2,
    });
  }

  const getCurrentContent = () => {
    if (activeCard) {
      const section = adminSections.find(s => s.id === activeSection);
      const card = section?.cards.find(c => c.id === activeCard);
      if (card?.component) {
        const Component = card.component;
        return <Component />;
      }
      return (
        <div className="p-8">
          <h2 className="text-2xl font-semibold mb-4">{card?.title}</h2>
          <p className="text-muted-foreground">{card?.description}</p>
        </div>
      );
    }

    const section = adminSections.find(s => s.id === activeSection);
    if (!section) {
      return (
        <div className="p-8">
          <h2 className="text-2xl font-semibold mb-4">Select a Section</h2>
          <p className="text-muted-foreground">Choose a section from the sidebar to configure your helpdesk.</p>
        </div>
      );
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{section.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{section.configuredCards} of {section.totalCards} Configured</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {section.cards.map((card) => (
            <Card 
              key={card.id} 
              className="cursor-pointer hover:shadow-md transition-shadow border border-border"
              onClick={() => setActiveCard(card.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <card.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-medium">{card.title}</CardTitle>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  {card.description}
                </CardDescription>
                {card.configured && (
                  <Badge variant="secondary" className="mt-3 bg-green-100 text-green-700 hover:bg-green-100">
                    Configured
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-background border-b border-border px-6 py-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-sm">A</span>
            </div>
            <h1 className="text-xl font-semibold">Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              Explore your plan
            </Button>
            <Button variant="outline" size="sm">
              New <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              Apps
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-background border-r border-border pt-16 fixed left-0 top-0 bottom-0 overflow-y-auto">
        <div className="p-6">
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-auto p-4 text-left",
                  activeSection === item.id && "bg-accent"
                )}
                onClick={() => {
                  setActiveSection(item.id);
                  setActiveCard("");
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-muted rounded">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-80 pt-16">
        {activeCard && (
          <div className="p-6 border-b border-border bg-muted/30">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveCard("")}
              className="mb-2"
            >
              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
              Back to {adminSections.find(s => s.id === activeSection)?.title}
            </Button>
          </div>
        )}
        {getCurrentContent()}
      </div>
    </div>
  );
}