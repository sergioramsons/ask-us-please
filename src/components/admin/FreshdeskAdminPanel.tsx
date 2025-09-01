import { useState } from "react";
import { 
  Settings, 
  Users, 
  Mail, 
  Shield, 
  BarChart3, 
  Workflow, 
  Clock, 
  Bell, 
  MessageSquare, 
  Phone, 
  Building2, 
  User, 
  Inbox,
  ChevronRight,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRoleManager } from "./UserRoleManager";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { EmailManager } from "./EmailManager";
import IncomingEmailManager from "./IncomingEmailManager";
import { ManualEmailProcessor } from "./ManualEmailProcessor";
import IncomingMailServerConfig from "./IncomingMailServerConfig";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { BusinessHoursConfig } from "./BusinessHoursConfig";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { EmailNotificationTester } from "./EmailNotificationTester";
import { SMSTester } from "./SMSTester";
import { ContactsManager } from "./ContactsManager";
import YeastarIntegration from "./YeastarIntegration";
import ThreeCXIntegration from "./ThreeCXIntegration";
import OrganizationManager from "./OrganizationManager";
import { ChannelManager } from "@/components/channels/ChannelManager";
import { UnifiedInbox } from "@/components/channels/UnifiedInbox";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Ticket } from "@/types/ticket";
import { MimeCleanupButton } from "./MimeCleanupButton";

interface AdminPanelProps {
  tickets: Ticket[];
  onCreateTicket?: (ticketData: any) => void;
}

interface AdminSection {
  id: string;
  title: string;
  icon: any;
  description?: string;
  subsections?: AdminSubsection[];
}

interface AdminSubsection {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: any;
}

export function FreshdeskAdminPanel({ tickets, onCreateTicket }: AdminPanelProps) {
  const { isSuperAdmin } = useOrganization();
  const [activeSection, setActiveSection] = useState<string>("general");
  const [activeSubsection, setActiveSubsection] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const adminSections: AdminSection[] = [
    {
      id: "general",
      title: "General Settings",
      icon: Settings,
      description: "Basic helpdesk configuration and settings",
      subsections: [
        {
          id: "account",
          title: "Account Settings",
          component: AccountDashboard,
        },
        {
          id: "business-hours",
          title: "Business Hours",
          component: BusinessHoursConfig,
        },
      ]
    },
    {
      id: "email",
      title: "Email",
      icon: Mail,
      description: "Configure email settings and automation",
      subsections: [
        {
          id: "outgoing-email",
          title: "Outgoing Email",
          component: EmailManager,
        },
        {
          id: "incoming-servers",
          title: "Incoming Servers",
          component: IncomingMailServerConfig,
        },
        {
          id: "incoming-emails",
          title: "Incoming Emails",
          component: IncomingEmailManager,
        },
        {
          id: "process-emails",
          title: "Process Emails",
          component: ManualEmailProcessor,
        },
        {
          id: "mime-cleanup",
          title: "MIME Content Cleanup",
          component: () => (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Clean MIME Content</h3>
                <p className="text-sm text-muted-foreground">
                  Clean up existing tickets and replies with raw MIME email content.
                </p>
              </div>
              <MimeCleanupButton />
            </div>
          ),
        },
      ]
    },
    {
      id: "channels",
      title: "Channels",
      icon: Inbox,
      description: "Manage communication channels and unified inbox",
      subsections: [
        {
          id: "channel-manager",
          title: "Channel Manager",
          component: ChannelManager,
        },
        {
          id: "unified-inbox",
          title: "Unified Inbox",
          component: UnifiedInbox,
        },
      ]
    },
    {
      id: "users",
      title: "Agents & Groups",
      icon: Users,
      description: "Manage users, roles, and departments",
      subsections: [
        {
          id: "user-roles",
          title: "User Roles",
          component: UserRoleManager,
        },
      ]
    },
    {
      id: "contacts",
      title: "Contacts",
      icon: User,
      description: "Manage customer contacts and information",
      subsections: [
        {
          id: "contact-manager",
          title: "Contact Manager",
          component: ContactsManager,
        },
      ]
    },
    {
      id: "workflows",
      title: "Automations",
      icon: Workflow,
      description: "Configure workflows and business rules",
      subsections: [
        {
          id: "workflow-builder",
          title: "Workflow Builder",
          component: WorkflowBuilder,
        },
      ]
    },
    {
      id: "integrations",
      title: "Integrations",
      icon: Phone,
      description: "Third-party integrations and PBX systems",
      subsections: [
        {
          id: "yeastar",
          title: "Yeastar PBX",
          component: YeastarIntegration,
        },
        {
          id: "3cx",
          title: "3CX PBX",
          component: ThreeCXIntegration,
        },
      ]
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      icon: BarChart3,
      description: "View performance metrics and generate reports",
      subsections: [
        {
          id: "dashboard",
          title: "Dashboard",
          component: ReportsDashboard,
          props: { tickets }
        },
      ]
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      description: "Configure email and SMS notifications",
      subsections: [
        {
          id: "email-test",
          title: "Email Testing",
          component: EmailNotificationTester,
        },
        {
          id: "sms-test",
          title: "SMS Testing",
          component: SMSTester,
        },
      ]
    },
  ];

  // Add organizations section only for super admins
  if (isSuperAdmin) {
    adminSections.unshift({
      id: "organizations",
      title: "Organizations",
      icon: Building2,
      description: "Manage multiple organizations and tenants",
      subsections: [
        {
          id: "organization-manager",
          title: "Organization Manager",
          component: OrganizationManager,
        },
      ]
    });
  }

  const filteredSections = adminSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.subsections?.some(sub => 
      sub.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getCurrentComponent = () => {
    const section = adminSections.find(s => s.id === activeSection);
    if (!section?.subsections?.length) return null;
    
    const subsection = section.subsections.find(s => s.id === activeSubsection) || section.subsections[0];
    const Component = subsection.component;
    
    return <Component {...(subsection.props || {})} />;
  };

  const getBreadcrumb = () => {
    const section = adminSections.find(s => s.id === activeSection);
    if (!section) return [];
    
    const subsection = section.subsections?.find(s => s.id === activeSubsection);
    return [section.title, subsection?.title].filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              {getBreadcrumb().map((crumb, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                  {crumb}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="space-y-2">
              {filteredSections.map((section) => (
                <div key={section.id}>
                  <Button
                    variant={activeSection === section.id ? "secondary" : "ghost"}
                    className={`w-full justify-start h-auto p-4 ${
                      activeSection === section.id 
                        ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500" 
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.subsections?.length) {
                        setActiveSubsection(section.subsections[0].id);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3 text-left">
                      <section.icon className={`h-5 w-5 mt-0.5 ${
                        activeSection === section.id ? "text-blue-700" : "text-gray-400"
                      }`} />
                      <div>
                        <div className="font-medium">{section.title}</div>
                        {section.description && (
                          <div className="text-xs text-gray-500 mt-1">{section.description}</div>
                        )}
                      </div>
                    </div>
                  </Button>
                  
                  {/* Subsections */}
                  {activeSection === section.id && section.subsections && (
                    <div className="ml-8 mt-2 space-y-1">
                      {section.subsections.map((subsection) => (
                        <Button
                          key={subsection.id}
                          variant={activeSubsection === subsection.id ? "secondary" : "ghost"}
                          size="sm"
                          className={`w-full justify-start ${
                            activeSubsection === subsection.id 
                              ? "bg-blue-100 text-blue-800" 
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                          onClick={() => setActiveSubsection(subsection.id)}
                        >
                          {subsection.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeSection && getCurrentComponent() ? (
            <div className="animate-fade-in">
              {getCurrentComponent()}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Welcome to Admin Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Select a setting category from the sidebar to get started with configuring your helpdesk.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}