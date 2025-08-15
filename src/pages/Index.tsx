import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/helpdesk/dashboard-stats";
import { TicketForm } from "@/components/helpdesk/ticket-form";
import { TicketList } from "@/components/helpdesk/ticket-list";
import { TicketDetail } from "@/components/helpdesk/ticket-detail";
import { Ticket, TicketStats, TicketStatus } from "@/types/ticket";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { useUserRoles } from "@/hooks/useUserRoles";
import { mockTickets } from "@/data/mock-tickets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFreshdeskSync } from "@/hooks/useFreshdeskSync";
import { Plus, Headphones, LogOut, User, RefreshCw, Shield, BarChart3 } from "lucide-react";

type View = 'dashboard' | 'create-ticket' | 'ticket-detail' | 'user-management' | 'reports';

const Index = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const { isLoading: isSyncing, syncTickets, createTicketInFreshdesk, updateTicketInFreshdesk } = useFreshdeskSync();
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
    // Create ticket in Freshdesk
    const freshdeskTicket = await createTicketInFreshdesk({
      title: ticketData.title,
      description: ticketData.description,
      status: 'open',
      priority: ticketData.priority,
      category: ticketData.category,
      customerName: ticketData.customerName,
      customerEmail: ticketData.customerEmail,
      tags: [],
    });

    if (freshdeskTicket) {
      setTickets(prev => [freshdeskTicket, ...prev]);
      setCurrentView('dashboard');
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('ticket-detail');
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Update in Freshdesk if it's a Freshdesk ticket
    if (ticket.id.startsWith('fd-') && (ticket as any).freshdeskId) {
      const success = await updateTicketInFreshdesk((ticket as any).freshdeskId, { status });
      if (!success) return;
    }

    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, status, updatedAt: new Date() }
        : t
    ));
    
    // Update selected ticket if it's the one being changed
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status, updatedAt: new Date() } : null);
    }
  };

  const handleSyncWithFreshdesk = async () => {
    const syncedTickets = await syncTickets();
    if (syncedTickets.length > 0) {
      setTickets(prev => {
        // Merge synced tickets with existing ones, avoiding duplicates
        const existing = prev.filter(t => !t.id.startsWith('fd-'));
        return [...syncedTickets, ...existing];
      });
    }
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
                <h1 className="text-2xl font-bold">HelpDesk Pro</h1>
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
                    onClick={handleSyncWithFreshdesk}
                    variant="outline"
                    disabled={isSyncing}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync Freshdesk
                  </Button>
                  <Button 
                    onClick={() => setCurrentView('create-ticket')}
                    className="bg-white text-primary hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                  {isAdmin() && (
                    <>
                      <Button 
                        onClick={() => setCurrentView('user-management')}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        User Management
                      </Button>
                      <Button 
                        onClick={() => setCurrentView('reports')}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Reports
                      </Button>
                    </>
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

        {currentView === 'user-management' && (
          <div className="max-w-4xl mx-auto">
            <UserRoleManager />
          </div>
        )}

        {currentView === 'reports' && (
          <ReportsDashboard tickets={tickets} />
        )}

        {currentView === 'ticket-detail' && selectedTicket && (
          <TicketDetail
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
