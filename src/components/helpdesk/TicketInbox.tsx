import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Ticket } from "@/types/ticket";
import { User, Clock, Eye, Trash2, Mail, MailOpen } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface TicketInboxProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onTicketDeleted?: () => void;
  selectionMode?: boolean;
  selectedTicketIds?: Set<string>;
  onToggleSelection?: (ticketId: string) => void;
}

export function TicketInbox({
  tickets,
  onViewTicket,
  onTicketDeleted,
  selectionMode,
  selectedTicketIds = new Set(),
  onToggleSelection
}: TicketInboxProps) {
  const { toast } = useToast();
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } else if (diffInHours < 24 * 7) {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short'
      }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  };

  const handleDelete = async (ticketId: string) => {
    setDeletingTicket(ticketId);
    try {
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

  const isUnread = (ticket: Ticket) => {
    // For demo purposes, assume tickets created in last 2 hours are unread
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    return ticket.createdAt > twoHoursAgo;
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="divide-y">
        {tickets.map((ticket) => {
          const unread = isUnread(ticket);
          return (
            <div
              key={ticket.id}
              className={`flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors ${
                selectedTicketIds.has(ticket.id) ? 'bg-accent/20' : ''
              } ${unread ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''} ${
                selectionMode ? '' : 'cursor-pointer'
              }`}
              onClick={() => !selectionMode && onViewTicket(ticket)}
            >
              {/* Selection checkbox */}
              {selectionMode && (
                <Checkbox
                  checked={selectedTicketIds.has(ticket.id)}
                  onCheckedChange={() => onToggleSelection?.(ticket.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              {/* Read/Unread indicator */}
              <div className="flex-shrink-0">
                {unread ? (
                  <Mail className="h-4 w-4 text-blue-600" />
                ) : (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Customer info */}
              <div className="flex-shrink-0 w-48">
                <div className={`font-medium ${unread ? 'font-semibold' : ''}`}>
                  {ticket.customer.name}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {ticket.customer.email}
                </div>
              </div>

              {/* Subject and preview */}
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${unread ? 'font-semibold' : ''}`}>
                  {ticket.title}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {ticket.description}
                </div>
              </div>

              {/* Status and Priority */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>

              {/* Time */}
              <div className="flex-shrink-0 w-16 text-right">
                <div className={`text-sm ${unread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {formatDate(ticket.createdAt)}
                </div>
              </div>

              {/* Actions */}
              {!selectionMode && (
                <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onViewTicket(ticket); }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        disabled={deletingTicket === ticket.id}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
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
                          onClick={() => handleDelete(ticket.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}