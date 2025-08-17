import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketForm } from "@/components/helpdesk/ticket-form";
import { TicketDetail } from "@/components/helpdesk/ticket-detail";
import { Ticket, TicketStats, TicketStatus } from "@/types/ticket";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { EnhancedTicketDetail } from "@/components/helpdesk/EnhancedTicketDetail";
import { UnifiedInbox } from "@/components/channels/UnifiedInbox";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import OrganizationSelector from "@/components/ui/organization-selector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationService } from "@/services/NotificationService";
import { Plus, Headphones, LogOut, User, Settings, BarChart3, Inbox, Ticket as TicketIcon, List } from "lucide-react";

type View = 'tickets' | 'inbox' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports';

const Index = () => {
  const { user, loading } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();
  const [currentView, setCurrentView] = useState<View>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showHelpdeskPopup, setShowHelpdeskPopup] = useState(false);
  const [callerInfo, setCallerInfo] = useState<{phone: string; name: string; email?: string} | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  // Load tickets from database
  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database tickets to match the UI format
      const transformedTickets: Ticket[] = (data || []).map(ticket => ({
        id: ticket.id,
        title: ticket.subject,
        description: ticket.description || '',
        status: ticket.status as any,
        priority: ticket.priority as any,
        severity: 'minor' as any,
        category: 'general',
        source: 'portal' as any,
        customer: {
          name: 'Customer',
          email: '',
        },
        createdAt: new Date(ticket.created_at),
        updatedAt: new Date(ticket.updated_at),
        tags: [],
        watchers: [],
        attachments: [],
        comments: [],
        slaBreached: false,
        escalationLevel: 0,
        customFields: {},
      }));

      setTickets(transformedTickets);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast({
        title: "Error loading tickets",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTicketsLoading(false);
    }
  };

  // Load tickets on component mount
  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  // Auto-launch helpdesk when coming from Yeastar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const popup = (params.get('popup') || '').toLowerCase();
    const phone = params.get('phone') || sessionStorage.getItem('yeastarPhone') || '';
    const name = params.get('name') || sessionStorage.getItem('yeastarName') || '';
    const fromQuery = popup === 'helpdesk' || !!phone || !!name;
    const fromSession = sessionStorage.getItem('yeastarLaunch') === '1';

    if (fromQuery || fromSession) {
      setCallerInfo({ phone, name });
      setShowHelpdeskPopup(true);

      // Try to find an existing contact by phone to prefill details
      (async () => {
        try {
          if (phone) {
            const { data, error } = await supabase
              .from('contacts')
              .select('*')
              .or(`phone.eq.${phone},phone.ilike.%${phone}%`)
              .limit(1);
            if (!error && data && data.length > 0) {
              const c: any = data[0];
              setCallerInfo({
                phone: c.phone || phone,
                name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || name,
                email: c.email || undefined,
              });
            }
          }
        } catch {}
      })();

      const caller = name ? `${name} (${phone})` : phone;
      toast({ title: 'Helpdesk launched', description: caller ? `Caller: ${caller}` : 'Launched from Yeastar PBX' });

      // cleanup session flags to avoid re-trigger
      sessionStorage.removeItem('yeastarLaunch');
      sessionStorage.removeItem('yeastarPhone');
      sessionStorage.removeItem('yeastarName');
    }
  }, []);

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
    try {
      // First, try to find or create a contact
      let contactId = null;
      if (ticketData.customerEmail) {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', ticketData.customerEmail)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
        } else {
          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              first_name: ticketData.customerName?.split(' ')[0] || '',
              last_name: ticketData.customerName?.split(' ').slice(1).join(' ') || '',
              email: ticketData.customerEmail,
              phone: ticketData.phone || callerInfo?.phone,
              organization_id: organization?.id || null,
              created_by: user?.id
            })
            .select('id')
            .single();

          if (contactError) {
            console.warn('Could not create contact:', contactError);
          } else {
            contactId = newContact.id;
          }
        }
      }

      // Create the ticket in the database
      // Generate a proper ticket number via DB function
      const { data: generatedNumber, error: genError } = await supabase.rpc('generate_ticket_number');
      if (genError) {
        throw genError;
      }

      const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
          organization_id: organization?.id || null, // Allow null if no org selected
          ticket_number: generatedNumber as string,
          subject: ticketData.title,
          description: ticketData.description,
          status: 'open',
          priority: ticketData.priority,
          contact_id: contactId,
          created_by: user?.id
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Refresh tickets list from database
      await loadTickets();
      
      setCurrentView('tickets');
      setShowHelpdeskPopup(false);

      // Send notification for new ticket
      if (ticketData.customerEmail) {
        await NotificationService.notifyTicketCreated(
          newTicket.ticket_number || newTicket.id,
          newTicket.subject,
          newTicket.priority,
          ticketData.customerEmail,
          ticketData.customerName
        );
      }

      toast({
        title: "Ticket created",
        description: `Ticket #${newTicket.ticket_number || newTicket.id} has been created and customer has been notified.`
      });
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error creating ticket",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('ticket-detail');
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      
      // Update in database
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'resolved' && { resolved_at: new Date().toISOString() })
        })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
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
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
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
                <h1 className="text-2xl font-bold">BS-HelpDesk</h1>
                <p className="text-blue-100">Unified Inbox & Support Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <OrganizationSelector />
              <div className="flex items-center gap-2 text-blue-100">
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.email}</span>
              </div>
              
              {(currentView !== 'tickets' && currentView !== 'inbox') && (
                <Button 
                  onClick={() => setCurrentView('tickets')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <TicketIcon className="h-4 w-4 mr-2" />
                  Back to Tickets
                </Button>
              )}
              
              {(currentView === 'tickets' || currentView === 'inbox') && (
                <>
                  <Button 
                    onClick={() => setCurrentView('tickets')}
                    variant={currentView === 'tickets' ? 'default' : 'outline'}
                    className={currentView === 'tickets' ? 'bg-white text-primary hover:bg-blue-50' : 'border-white/20 text-white hover:bg-white/10'}
                  >
                    <TicketIcon className="h-4 w-4 mr-2" />
                    Tickets
                  </Button>
                  <Button 
                    onClick={() => setCurrentView('inbox')}
                    variant={currentView === 'inbox' ? 'default' : 'outline'}
                    className={currentView === 'inbox' ? 'bg-white text-primary hover:bg-blue-50' : 'border-white/20 text-white hover:bg-white/10'}
                  >
                    <Inbox className="h-4 w-4 mr-2" />
                    Inbox
                  </Button>
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
        {currentView === 'tickets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">All Tickets</h2>
                <p className="text-muted-foreground">Manage and track all support tickets</p>
              </div>
              <Button 
                onClick={() => setCurrentView('create-ticket')}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
            
            {/* Ticket Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-card p-4 rounded-lg border">
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Tickets</div>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <div className="text-2xl font-bold text-red-600">{stats.open}</div>
                <div className="text-sm text-muted-foreground">Open</div>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                <div className="text-sm text-muted-foreground">Resolved</div>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
                <div className="text-sm text-muted-foreground">Closed</div>
              </div>
            </div>

            {/* Import existing ticket list component */}
            <div className="bg-card border rounded-lg">
              {!ticketsLoading && (
                <div className="p-6">
                  {tickets.length === 0 ? (
                    <div className="text-center py-8">
                      <TicketIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No tickets yet</h3>
                      <p className="text-muted-foreground">Create your first ticket to get started</p>
                      <Button 
                        onClick={() => setCurrentView('create-ticket')}
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Ticket
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket) => (
                        <div 
                          key={ticket.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleViewTicket(ticket)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">#{ticket.id.slice(0, 8)}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                                ticket.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                                ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {ticket.status}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                                ticket.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {ticket.priority}
                              </span>
                            </div>
                            <h3 className="font-medium mt-1">{ticket.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                              Created {ticket.createdAt.toLocaleDateString()} • Updated {ticket.updatedAt.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {ticketsLoading && (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading tickets...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'inbox' && (
          <UnifiedInbox />
        )}

        {currentView === 'create-ticket' && (
          <div className="max-w-2xl mx-auto">
            <TicketForm 
              onSubmit={handleCreateTicket}
              onCancel={() => setCurrentView('tickets')}
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
            onBack={() => setCurrentView('tickets')}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      {/* Helpdesk Popup Modal */}
      <Dialog open={showHelpdeskPopup} onOpenChange={setShowHelpdeskPopup}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Create Support Ticket
              {callerInfo && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {callerInfo.name ? `${callerInfo.name} (${callerInfo.phone})` : callerInfo.phone}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <TicketForm 
            onSubmit={handleCreateTicket}
            onCancel={() => setShowHelpdeskPopup(false)}
            defaultPhone={callerInfo?.phone}
            defaultName={callerInfo?.name}
            defaultEmail={callerInfo?.email}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
