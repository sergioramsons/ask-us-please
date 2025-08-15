import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/helpdesk/dashboard-stats";
import { TicketForm } from "@/components/helpdesk/ticket-form";
import { TicketList } from "@/components/helpdesk/ticket-list";
import { TicketDetail } from "@/components/helpdesk/ticket-detail";
import { Ticket, TicketStats, TicketStatus } from "@/types/ticket";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { EnhancedTicketForm } from "@/components/helpdesk/EnhancedTicketForm";
import { EnhancedTicketDetail } from "@/components/helpdesk/EnhancedTicketDetail";
import { useUserRoles } from "@/hooks/useUserRoles";
import { mockTickets } from "@/data/mock-tickets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationService } from "@/services/NotificationService";
import { Plus, Headphones, LogOut, User, Settings, BarChart3 } from "lucide-react";

type View = 'dashboard' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports';

const Index = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Redirect to auth if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats: TicketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };

  const handleCreateTicket = async (ticketData: any) => {
    const newTicket: Ticket = {
      id: Date.now().toString(),
      title: ticketData.title,
      description: ticketData.description,
      status: 'open',
      priority: ticketData.priority,
      severity: 'minor',
      category: ticketData.category,
      source: 'portal',
      customer: {
        name: ticketData.customerName,
        email: ticketData.customerEmail,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      watchers: [],
      attachments: [],
      comments: [],
      slaBreached: false,
      escalationLevel: 0,
      customFields: {},
    };

    setTickets(prev => [newTicket, ...prev]);
    setCurrentView('dashboard');

    // Send notification for new ticket
    if (ticketData.customerEmail) {
      await NotificationService.notifyTicketCreated(
        newTicket.id,
        newTicket.title,
        newTicket.priority,
        ticketData.customerEmail,
        ticketData.customerName
      );
    }

    toast({
      title: "Ticket created",
      description: `Ticket #${newTicket.id} has been created and customer has been notified.`
    });
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('ticket-detail');
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    const ticket = tickets.find(t => t.id === ticketId);
    
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, status, updatedAt: new Date() }
        : t
    ));
    
    // Update selected ticket if it's the one being changed
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status, updatedAt: new Date() } : null);
    }

    // Send notification for status change
    if (ticket?.customer.email) {
      await NotificationService.notifyTicketUpdated(
        ticketId,
        ticket.title,
        status,
        ticket.customer.email,
        user?.email || 'Support Team',
        `Ticket status changed to ${status}`
      );
    }

    toast({
      title: "Status updated",
      description: `Ticket #${ticketId} status changed to ${status}. Customer has been notified.`
    });
  };


  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-white shadow-large">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">BS-HelpDesk</h1>
                <p className="text-blue-100">Support Ticket Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-100">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
              
              {currentView === 'dashboard' && (
                <>
                  <Button 
                    onClick={() => setCurrentView('create-ticket')}
                    className="bg-white text-primary hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                  <Button 
                    onClick={() => setCurrentView('reports')}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Reports
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/portal'}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Portal
                  </Button>
                  {isAdmin() && (
                    <Button 
                      onClick={() => setCurrentView('admin-panel')}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Button>
                  )}
                </>
              )}
              
              <Button 
                onClick={handleSignOut}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            <DashboardStats stats={stats} />
            <TicketList tickets={tickets} onViewTicket={handleViewTicket} />
          </div>
        )}

        {currentView === 'create-ticket' && (
          <div className="max-w-2xl mx-auto">
            <TicketForm 
              onSubmit={handleCreateTicket}
              onCancel={() => setCurrentView('dashboard')}
            />
          </div>
        )}

        {currentView === 'reports' && (
          <ReportsDashboard tickets={tickets} />
        )}

        {currentView === 'admin-panel' && (
          <AdminPanel tickets={tickets} onCreateTicket={handleCreateTicket} />
        )}

        {currentView === 'ticket-detail' && selectedTicket && (
          <EnhancedTicketDetail
            ticket={selectedTicket}
            onBack={() => setCurrentView('dashboard')}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
