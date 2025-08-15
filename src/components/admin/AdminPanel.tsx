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
import { Ticket } from "@/types/ticket";
import { Mail, Shield, BarChart3, Settings, Workflow, Clock, User, Bell, Users, MessageSquare, Phone } from "lucide-react";

interface AdminPanelProps {
  tickets: Ticket[];
  onCreateTicket?: (ticketData: any) => void;
}

export function AdminPanel({ tickets, onCreateTicket }: AdminPanelProps) {
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
      
      <Tabs defaultValue="email" className="space-y-6">
<TabsList className="grid w-full grid-cols-11">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="business-hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Business Hours
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Email Test
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS Test
          </TabsTrigger>
          <TabsTrigger value="pbx" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            PBX Integration
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="enhanced-ticket" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Enhanced Ticket
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="space-y-4">
          <EmailManager />
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
          <YeastarIntegration />
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