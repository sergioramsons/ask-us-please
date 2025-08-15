import { cn } from "@/lib/utils";
import { TicketStatus, TicketPriority } from "@/types/ticket";

interface StatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

interface PriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    'open': 'bg-info text-info-foreground',
    'in-progress': 'bg-warning text-warning-foreground',
    'resolved': 'bg-success text-success-foreground',
    'closed': 'bg-muted text-muted-foreground'
  };

  const labels = {
    'open': 'Open',
    'in-progress': 'In Progress',
    'resolved': 'Resolved',
    'closed': 'Closed'
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      variants[status],
      className
    )}>
      {labels[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const variants = {
    'low': 'bg-muted text-muted-foreground',
    'medium': 'bg-info text-info-foreground',
    'high': 'bg-warning text-warning-foreground',
    'urgent': 'bg-destructive text-destructive-foreground'
  };

  const labels = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'urgent': 'Urgent'
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      variants[priority],
      className
    )}>
      {labels[priority]}
    </span>
  );
}