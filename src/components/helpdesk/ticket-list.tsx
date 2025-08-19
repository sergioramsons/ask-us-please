import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { Ticket, TicketStatus } from "@/types/ticket";
import { Search, Eye, Clock, User, Trash2, CheckSquare, Square } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface TicketListProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onTicketDeleted?: () => void;
  selectionMode?: boolean;
  selectedTicketIds?: Set<string>;
  onToggleSelection?: (ticketId: string) => void;
  onBulkDelete?: (ticketIds: string[]) => void;
}

export function TicketList({ 
  tickets, 
  onViewTicket, 
  onTicketDeleted, 
  selectionMode = false, 
  selectedTicketIds = new Set(), 
  onToggleSelection,
  onBulkDelete 
}: TicketListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDeleteTicket = async (ticketId: string) => {
    setDeletingTicket(ticketId);
    try {
      // Use the secure delete function instead of direct SQL
      const { error } = await supabase
        .rpc('delete_ticket', { ticket_id_param: ticketId });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });

      if (onTicketDeleted) {
        onTicketDeleted();
      }
    } catch (error) {
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    // Debug logging
    if (statusFilter !== 'all') {
      console.log('Filtering ticket:', {
        title: ticket.title,
        status: ticket.status,
        filter: statusFilter,
        matches: matchesStatus
      });
    }
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className="shadow-medium animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Support Tickets</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'})
          </span>
        </CardTitle>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: TicketStatus | 'all') => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No tickets found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className={`p-4 border rounded-lg transition-all duration-200 animate-slide-up ${
                  selectionMode ? 'hover:bg-accent/30' : 'hover:shadow-soft cursor-pointer'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => !selectionMode && onViewTicket(ticket)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {selectionMode && (
                      <Checkbox
                        checked={selectedTicketIds.has(ticket.id)}
                        onCheckedChange={() => onToggleSelection?.(ticket.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground truncate">
                          {ticket.title}
                        </h3>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{ticket.customer.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                  </div>
                  
                  {!selectionMode && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onViewTicket(ticket); }}
                        className="shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 text-destructive hover:text-destructive"
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
                              Are you sure you want to delete ticket "{ticket.title}"? This action cannot be undone and will remove all comments and data associated with this ticket.
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}