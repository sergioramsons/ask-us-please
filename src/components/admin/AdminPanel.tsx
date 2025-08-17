import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { EmailManager } from "@/components/admin/EmailManager";
import IncomingEmailManager from "@/components/admin/IncomingEmailManager";
import IncomingMailServerConfig from "@/components/admin/IncomingMailServerConfig";
import { EnhancedTicketForm } from "@/components/helpdesk/EnhancedTicketForm";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { BusinessHoursConfig } from "@/components/admin/BusinessHoursConfig";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { EmailNotificationTester } from "@/components/admin/EmailNotificationTester";
import { SMSTester } from "@/components/admin/SMSTester";
import { ContactsManager } from "@/components/admin/ContactsManager";
import YeastarIntegration from "@/components/admin/YeastarIntegration";
import ThreeCXIntegration from "@/components/admin/ThreeCXIntegration";
import OrganizationManager from "@/components/admin/OrganizationManager";
import { ChannelManager } from "@/components/channels/ChannelManager";
import { UnifiedInbox } from "@/components/channels/UnifiedInbox";
import { Ticket } from "@/types/ticket";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Mail, Shield, BarChart3, Settings, Workflow, Clock, User, Bell, Users, MessageSquare, Phone, Inbox, Building2 } from "lucide-react";

interface AdminPanelProps {
  tickets: Ticket[];
  onCreateTicket?: (ticketData: any) => void;
}

export function AdminPanel({ tickets, onCreateTicket }: AdminPanelProps) {
  const { isSuperAdmin } = useOrganization();
  
  const handleCreateTicket = (ticketData: any) => {
    if (onCreateTicket) {
      onCreateTicket(ticketData);
    }
  };
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
        <p className="text-muted-foreground">Manage email settings, users, reports, workflows, and create enhanced tickets</p>
      </div>
      
      <Tabs defaultValue="channels" className="space-y-6">
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full min-w-fit grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1 h-auto p-1">
            {isSuperAdmin && (
              <TabsTrigger value="organizations" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Organizations</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="channels" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">Channels</span>
            </TabsTrigger>
            <TabsTrigger value="inbox" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Inbox</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Workflow className="h-4 w-4" />
              <span className="hidden sm:inline">Workflows</span>
            </TabsTrigger>
            <TabsTrigger value="business-hours" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Hours</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Email Test</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">SMS Test</span>
            </TabsTrigger>
            <TabsTrigger value="pbx" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">PBX</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2 whitespace-nowrap px-3 py-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        {isSuperAdmin && (
          <TabsContent value="organizations" className="space-y-4">
            <OrganizationManager />
          </TabsContent>
        )}
        
        <TabsContent value="channels" className="space-y-4">
          <ChannelManager />
        </TabsContent>
        
        <TabsContent value="inbox" className="space-y-4 h-[800px]">
          <UnifiedInbox />
        </TabsContent>
        
        <TabsContent value="email" className="space-y-4">
          <Tabs defaultValue="outgoing" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="outgoing">Outgoing Mail</TabsTrigger>
              <TabsTrigger value="incoming-servers">Incoming Servers</TabsTrigger>
              <TabsTrigger value="incoming-emails">Incoming Emails</TabsTrigger>
            </TabsList>
            <TabsContent value="outgoing">
              <EmailManager />
            </TabsContent>
            <TabsContent value="incoming-servers">
              <IncomingMailServerConfig />
            </TabsContent>
            <TabsContent value="incoming-emails">
              <IncomingEmailManager />
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <UserRoleManager />
        </TabsContent>
        
        <TabsContent value="contacts" className="space-y-4">
          <ContactsManager />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <ReportsDashboard tickets={tickets} />
        </TabsContent>
        
        <TabsContent value="workflow" className="space-y-4">
          <WorkflowBuilder />
        </TabsContent>
        
        <TabsContent value="business-hours" className="space-y-4">
          <BusinessHoursConfig />
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <EmailNotificationTester />
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <SMSTester />
        </TabsContent>
        
        <TabsContent value="pbx" className="space-y-4">
          <Tabs defaultValue="yeastar" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="yeastar">Yeastar PBX</TabsTrigger>
              <TabsTrigger value="3cx">3CX PBX</TabsTrigger>
            </TabsList>
            <TabsContent value="yeastar">
              <YeastarIntegration />
            </TabsContent>
            <TabsContent value="3cx">
              <ThreeCXIntegration />
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-4">
          <AccountDashboard />
        </TabsContent>
        
        
        <TabsContent value="enhanced-ticket" className="space-y-4">
          <EnhancedTicketForm 
            onSubmit={handleCreateTicket}
            onCancel={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}