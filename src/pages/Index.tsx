import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TicketForm } from "@/components/helpdesk/ticket-form";
import { TicketDetail } from "@/components/helpdesk/ticket-detail";
import { Ticket, TicketStats, TicketStatus, TicketCategory } from "@/types/ticket";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { CombinedContactsCompanies } from "@/components/admin/CombinedContactsCompanies";
import { ReportsDashboard } from "@/components/reports/ReportsDashboard";
import { EnhancedTicketDetail } from "@/components/helpdesk/EnhancedTicketDetail";
import { TicketList } from "@/components/helpdesk/ticket-list";
import { UnifiedInbox } from "@/components/channels/UnifiedInbox";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { FreshdeskLayout } from "@/components/layout/FreshdeskLayout";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationService } from "@/services/NotificationService";
import { parseMultipartEmail } from "@/lib/emailParser";
import { Plus, Trash2, Ticket as TicketIcon, Headphones, CheckSquare, Square } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type View = 'tickets' | 'inbox' | 'contacts-companies' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports' | 'account';

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
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

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
        const parsed = parseMultipartEmail(ticket.description || '');
        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number || ticket.id,
          title: ticket.subject,
          description: parsed.text,
          status: ticket.status as any,
          priority: ticket.priority as any,
          severity: 'minor' as any,
          category: (ticket.category as TicketCategory) || 'general',
          department_id: ticket.department_id,
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
          replies: [],
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

  // Open ticket detail from URL param after tickets load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('ticketId');
    if (ticketId && tickets.length > 0) {
      const t = tickets.find(t => t.id === ticketId);
      if (t) {
        setSelectedTicket(t);
        setCurrentView('ticket-detail');
      }
    }
  }, [tickets]);

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

  const setTicketParam = (id: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (id) {
      params.set('ticketId', id);
    } else {
      params.delete('ticketId');
    }
    const newQuery = params.toString();
    const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`;
    window.history.replaceState({}, '', newUrl);
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
          category: ticketData.category || 'general',
          department_id: ticketData.departmentId === 'unassigned' ? null : ticketData.departmentId || null,
          contact_id: contactId,
          created_by: user?.id,
          cc_recipients: ticketData.cc_recipients || []
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
          ticketData.customerName,
          ticketData.cc_recipients // Pass CC recipients to notification service
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

  const handleDepartmentChange = async (ticketId: string, departmentId: string | null) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ department_id: departmentId })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, department_id: departmentId }
            : ticket
        )
      );

      toast({
        title: "Success",
        description: "Ticket department updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating ticket department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket department",
        variant: "destructive"
      });
    }
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (selectedTicketIds.size === 0) return;
    
    setDeletingMultiple(true);
    try {
      const { data, error } = await supabase
        .rpc('delete_multiple_tickets', { 
          ticket_ids: Array.from(selectedTicketIds) 
        });

      if (error) throw error;

      const result = data as { success: boolean; deleted_count: number; total_requested: number };
      
      await loadTickets();
      setSelectedTicketIds(new Set());
      setIsSelectionMode(false);

      toast({
        title: "Success",
        description: `${result.deleted_count} of ${result.total_requested} tickets deleted successfully`,
      });
    } catch (error: any) {
      console.error('Error deleting tickets:', error);
      toast({
        title: "Error",
        description: "Failed to delete selected tickets",
        variant: "destructive",
      });
    } finally {
      setDeletingMultiple(false);
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedTicketIds(new Set());
  };

  // Toggle ticket selection
  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTicketIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  // Select all visible tickets
  const selectAllTickets = () => {
    const visibleTickets = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);
    setSelectedTicketIds(new Set(visibleTickets.map(t => t.id)));
  };

  // Deselect all tickets
  const deselectAllTickets = () => {
    setSelectedTicketIds(new Set());
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('ticket-detail');
    setTicketParam(ticket.id);
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
    <div className="space-y-4">
      {/* Top bar actions to mirror Freshdesk minimalism */}
      <div className="flex items-center justify-between">
        <div className="sr-only">
          <h2>Tickets</h2>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode && (
            <>
              <span className="text-sm text-muted-foreground">{selectedTicketIds.size} selected</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedTicketIds.size === 0 || deletingMultiple}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Multiple Tickets</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedTicketIds.size} tickets? This action cannot be undone and will remove all replies and data associated with these tickets.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete {selectedTicketIds.size} Tickets
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
          >
            {isSelectionMode ? "Exit Selection" : "Select Multiple"}
          </Button>

          <Button onClick={() => setCurrentView('create-ticket')}>
            <Plus className="h-4 w-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Freshdesk-style Ticket List */}
      <TicketList
        tickets={tickets}
        onViewTicket={handleViewTicket}
        onTicketDeleted={loadTickets}
        selectionMode={isSelectionMode}
        selectedTicketIds={selectedTicketIds}
        onToggleSelection={toggleTicketSelection}
      />
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

      {currentView === 'contacts-companies' && (
        <CombinedContactsCompanies />
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

      {currentView === 'account' && (
        <AccountDashboard onBack={() => setCurrentView('tickets')} />
      )}

      {currentView === 'ticket-detail' && selectedTicket && (
        <EnhancedTicketDetail
          ticket={selectedTicket}
          onBack={() => { setTicketParam(null); setCurrentView('tickets'); }}
          onStatusChange={handleStatusChange}
          onDepartmentChange={handleDepartmentChange}
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