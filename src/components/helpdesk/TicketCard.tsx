import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Ticket } from "@/types/ticket";
import { User, Clock, Eye, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface TicketCardProps {
  ticket: Ticket;
  onViewTicket: (ticket: Ticket) => void;
  onTicketDeleted?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (ticketId: string) => void;
}

export function TicketCard({
  ticket,
  onViewTicket,
  onTicketDeleted,
  selectionMode,
  isSelected,
  onToggleSelection
}: TicketCardProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .rpc('delete_ticket', { ticket_id_param: ticket.id });

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
      setDeleting(false);
    }
  };

  return (
    <div
      className={`bg-card border rounded-lg p-4 hover:shadow-sm transition-all duration-200 ${
        selectionMode ? 'hover:bg-accent/30' : 'cursor-pointer hover:border-primary/20'
      } ${isSelected ? 'ring-2 ring-primary/20 bg-accent/10' : ''}`}
      onClick={() => !selectionMode && onViewTicket(ticket)}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection?.(ticket.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
        )}
        
        <div className="flex-1 min-w-0">
          {/* Header with title and badges */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-medium text-foreground truncate">
              {ticket.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>

          {/* Customer and date info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{ticket.customer.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {ticket.description}
          </p>

          {/* Actions */}
          {!selectionMode && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(ticket as any).tags && (
                  <div className="flex gap-1">
                    {(ticket as any).tags.slice(0, 2).map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onViewTicket(ticket); }}
                  className="h-8"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      disabled={deleting}
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
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}