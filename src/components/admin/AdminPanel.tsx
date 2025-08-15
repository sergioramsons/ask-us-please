import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { EmailServerConfig } from "@/components/helpdesk/EmailServerConfig";
import { EnhancedTicketForm } from "@/components/helpdesk/EnhancedTicketForm";
import { Ticket } from "@/types/ticket";
import { Mail, Shield, BarChart3, Settings } from "lucide-react";

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
        <p className="text-muted-foreground">Manage email settings, users, reports, and create enhanced tickets</p>
      </div>
      
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="enhanced-ticket" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Enhanced Ticket
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="space-y-4">
          <EmailServerConfig />
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <UserRoleManager />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <ReportsDashboard tickets={tickets} />
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