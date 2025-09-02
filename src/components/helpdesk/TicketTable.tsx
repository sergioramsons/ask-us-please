import { Button } from "@/components/ui/button";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket } from "@/types/ticket";
import { Eye, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface TicketTableProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onTicketDeleted?: () => void;
  selectionMode?: boolean;
  selectedTicketIds?: Set<string>;
  onToggleSelection?: (ticketId: string) => void;
}

export function TicketTable({
  tickets,
  onViewTicket,
  onTicketDeleted,
  selectionMode,
  selectedTicketIds = new Set(),
  onToggleSelection
}: TicketTableProps) {
  const { toast } = useToast();
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {selectionMode && (
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
            )}
            <TableHead>Contact & Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className={`cursor-pointer hover:bg-accent/50 ${
                selectedTicketIds.has(ticket.id) ? 'bg-accent/20' : ''
              }`}
              onClick={() => !selectionMode && onViewTicket(ticket)}
            >
              {selectionMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedTicketIds.has(ticket.id)}
                    onCheckedChange={() => onToggleSelection?.(ticket.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
              )}
              <TableCell>
                <div>
                  <div className="font-medium text-foreground">
                    {ticket.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {ticket.customer.name} • {ticket.customer.email}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(ticket.createdAt)}
              </TableCell>
              <TableCell>
                {!selectionMode && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onViewTicket(ticket); }}                     >
                      <Eye className="h-3 w-3" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}