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
import { FreshdeskLayout } from "@/components/layout/FreshdeskLayout";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationService } from "@/services/NotificationService";
import { Plus, Trash2, Ticket as TicketIcon, Headphones } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  // Load tickets from database
const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const orgId = organization?.id || null;
      console.log('Loading tickets for org:', orgId);

      // Build query with optional organization filter to align with RLS
      let query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get contact details for tickets that have contact_id
      const ticketIds = (data || []).map(ticket => ticket.id);
      const contactIds = (data || []).map(ticket => ticket.contact_id).filter(Boolean);
      
      let contactsMap = new Map();
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, company')
          .in('id', contactIds);
        
        if (contacts) {
          contactsMap = new Map(contacts.map(contact => [contact.id, contact]));
        }
      }

      // Transform database tickets to match the UI format
      const transformedTickets: Ticket[] = (data || []).map(ticket => {
        const contact = contactsMap.get(ticket.contact_id);
        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number || ticket.id,
          title: ticket.subject,
          description: ticket.description || '',
          status: ticket.status as any,
          priority: ticket.priority as any,
          severity: 'minor' as any,
          category: 'general',
          source: 'portal' as any,
          customer: {
            name: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Customer',
            email: contact?.email || '',
            phone: contact?.phone || '',
            company: contact?.company || '',
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
        };
      });

      console.log('Loaded tickets from database:', transformedTickets.length, transformedTickets);
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

// Load tickets when auth/org ready or when org changes
  useEffect(() => {
    if (user && !orgLoading) {
      loadTickets();
    }
  }, [user, organization?.id, orgLoading]);

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
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
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
        console.log('Creating ticket for customer:', { email: ticketData.customerEmail, name: ticketData.customerName, organization: organization?.id, user: user?.id });
        
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', ticketData.customerEmail)
          .maybeSingle();

        if (existingContact) {
          console.log('Found existing contact:', existingContact.id);
          contactId = existingContact.id;
        } else {
          // Create new contact
          console.log('Creating new contact...');
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              name: ticketData.customerName || (callerInfo?.phone ? `Caller ${callerInfo.phone}` : 'Customer'),
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
            console.error('Could not create contact:', contactError);
          } else {
            console.log('Successfully created contact:', newContact.id);
            contactId = newContact.id;
          }
        }
      }

      // Create the ticket in the database
      const { data: generatedNumber, error: genError } = await supabase.rpc('generate_ticket_number', { org_id: organization?.id });
      if (genError) {
        throw genError;
      }

      const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
          organization_id: organization?.id || null,
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

      // Auto-assign the ticket if assignment rules are configured
      try {
        const { data: assignedAgent, error: assignError } = await supabase.rpc('auto_assign_ticket', {
          ticket_id_param: newTicket.id,
          org_id: organization?.id as string
        });
        
        if (assignError) {
          console.warn('Auto-assignment failed:', assignError);
        } else if (assignedAgent) {
          console.log('Ticket auto-assigned to:', assignedAgent);
          toast({
            title: "Ticket Auto-Assigned",
            description: `Ticket has been automatically assigned to ${assignedAgent}`,
          });
        }
      } catch (autoAssignError) {
        console.warn('Auto-assignment error:', autoAssignError);
        // Don't fail ticket creation if auto-assignment fails
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

  const handleDeleteTicket = async (ticketId: string) => {
    setDeletingTicket(ticketId);
    try {
      const { error } = await supabase
        .rpc('delete_ticket', { ticket_id_param: ticketId });

      if (error) throw error;

      await loadTickets();

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting ticket:', error);
      toast({
        title: "Error",
        description: "Failed to delete ticket",
        variant: "destructive",
      });
    } finally {
      setDeletingTicket(null);
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('ticket-detail');
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    try {
      const ticket = tickets.find(t => t.id === ticketId);
      
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'resolved' && { resolved_at: new Date().toISOString() })
        })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t =>
        t.id === ticketId
          ? { ...t, status, updatedAt: new Date() }
          : t
      ));
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status, updatedAt: new Date() } : null);
      }

      if (ticket?.customer.email) {
        await NotificationService.notifyTicketUpdated(
          ticket?.ticketNumber || ticketId,
          ticket.title,
          status,
          ticket.customer.email,
          user?.email || 'Support Team',
          `Ticket status changed to ${status}`
        );
      }

      toast({
        title: "Status updated",
        description: `Ticket #${ticket?.ticketNumber || ticketId} status changed to ${status}. Customer has been notified.`
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

  const renderTicketsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">All Tickets</h2>
          <p className="text-muted-foreground">Manage and track all support tickets</p>
        </div>
        <Button 
          onClick={() => setCurrentView('create-ticket')}
          variant="freshdesk"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>
      
      {/* Ticket Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'Total', value: stats.total, color: 'text-primary' },
          { key: 'open', label: 'Open', value: stats.open, color: 'text-red-600' },
          { key: 'in-progress', label: 'In Progress', value: stats.inProgress, color: 'text-orange-600' },
          { key: 'resolved', label: 'Resolved', value: stats.resolved, color: 'text-green-600' },
          { key: 'closed', label: 'Closed', value: stats.closed, color: 'text-gray-600' },
        ].map((stat) => (
          <div
            key={stat.key}
            role="button"
            tabIndex={0}
            onClick={() => setStatusFilter(stat.key as any)}
            onKeyDown={(e) => e.key === 'Enter' && setStatusFilter(stat.key as any)}
            className={`freshdesk-card cursor-pointer transition-all hover:shadow-medium ${
              statusFilter === stat.key ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {statusFilter === 'all' ? tickets.length : tickets.filter(t => t.status === statusFilter).length} of {tickets.length}
          {statusFilter !== 'all' && (
            <span> • Filter: <span className="font-medium capitalize">{String(statusFilter).replace('-', ' ')}</span></span>
          )}
        </div>
        {statusFilter !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Tickets List */}
      <div className="freshdesk-card">
        {!ticketsLoading && (
          <div>
            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <TicketIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No tickets yet</h3>
                <p className="text-muted-foreground mb-4">Create your first ticket to get started</p>
                <Button 
                  onClick={() => setCurrentView('create-ticket')}
                  variant="freshdesk"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {(statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter)).map((ticket) => (
                   <div 
                     key={ticket.id}
                     className="flex items-center justify-between p-4 border border-border rounded hover:bg-accent/50 transition-colors cursor-pointer"
                     onClick={() => handleViewTicket(ticket)}
                   >
                     <div className="flex-1">
                       <div className="flex items-center gap-3">
                         <span className="font-medium text-sm">#{ticket.ticketNumber || ticket.id.slice(0, 8)}</span>
                         <span className={`px-2 py-1 rounded text-xs font-medium ${
                           ticket.status === 'open' ? 'bg-red-100 text-red-800' :
                           ticket.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                           ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                           'bg-gray-100 text-gray-800'
                         }`}>
                           {ticket.status}
                         </span>
                         <span className={`px-2 py-1 rounded text-xs font-medium ${
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
                     
                     <div className="flex items-center gap-2 ml-4">
                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button
                             variant="outline"
                             size="sm"
                             className="text-destructive hover:text-destructive"
                             disabled={deletingTicket === ticket.id}
                             onClick={(e) => e.stopPropagation()}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                           <AlertDialogHeader>
                             <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
                             <AlertDialogDescription>
                               Are you sure you want to delete ticket "{ticket.title}"? This action cannot be undone.
                             </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>Cancel</AlertDialogCancel>
                             <AlertDialogAction
                               onClick={() => handleDeleteTicket(ticket.id)}
                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                             >
                               Delete Ticket
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {ticketsLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tickets...</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <FreshdeskLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      onCreateTicket={() => setCurrentView('create-ticket')}
    >
      {currentView === 'tickets' && renderTicketsView()}

      {currentView === 'inbox' && (
        <UnifiedInbox />
      )}

      {currentView === 'create-ticket' && (
        <div className="max-w-2xl mx-auto">
          <div className="freshdesk-card">
            <TicketForm 
              onSubmit={handleCreateTicket}
              onCancel={() => setCurrentView('tickets')}
            />
          </div>
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
    </FreshdeskLayout>
  );
};

export default Index;