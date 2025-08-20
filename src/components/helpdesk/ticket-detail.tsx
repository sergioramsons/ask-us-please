import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/ui/status-badge";
import { Ticket, TicketStatus } from "@/types/ticket";
import { ArrowLeft, User, Mail, Calendar, Tag, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDepartments } from "@/hooks/useDepartments";
import { TicketAssignmentManager } from "./TicketAssignmentManager";

interface TicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
  onDepartmentChange?: (ticketId: string, departmentId: string | null) => void;
}

export function TicketDetail({ ticket, onBack, onStatusChange, onDepartmentChange }: TicketDetailProps) {
  const { toast } = useToast();
  const { departments, fetchDepartments } = useDepartments();
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [currentDepartment, setCurrentDepartment] = useState<string | null>((ticket as any).department_id || null);

  // Load departments on mount
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleStatusChange = (newStatus: TicketStatus) => {
    setCurrentStatus(newStatus);
    onStatusChange(ticket.id, newStatus);
    toast({
      title: "Status Updated",
      description: `Ticket status changed to ${newStatus.replace('-', ' ')}.`
    });
  };

  const handleDepartmentChange = async (newDepartmentId: string) => {
    const departmentId = newDepartmentId === 'unassigned' ? null : newDepartmentId;
    setCurrentDepartment(departmentId);
    
    if (onDepartmentChange) {
      onDepartmentChange(ticket.id, departmentId);
    }
    
    toast({
      title: "Department Updated",
      description: departmentId 
        ? `Ticket transferred to ${departments.find(d => d.id === departmentId)?.name}`
        : "Ticket removed from department"
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Ticket Details</h1>
      </div>

      <Card className="shadow-medium">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{ticket.title}</CardTitle>
              <div className="flex items-center gap-3">
                <StatusBadge status={currentStatus} />
                <PriorityBadge priority={ticket.priority} />
                <Badge variant="outline" className="capitalize">
                  {ticket.category.replace('-', ' ')}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {departments.find(d => d.id === currentDepartment)?.name || 'No Department'}
                </Badge>
              </div>
            </div>
            <div className="shrink-0 flex gap-2">
              <div className="min-w-[140px]">
                <Select value={currentDepartment || 'unassigned'} onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">No Department</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px]">
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{ticket.customer.name}</p>
                  <p className="text-muted-foreground">Customer</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{ticket.customer.email}</p>
                  <p className="text-muted-foreground">Email</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{formatDate(ticket.createdAt)}</p>
                  <p className="text-muted-foreground">Created</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{formatDate(ticket.updatedAt)}</p>
                  <p className="text-muted-foreground">Last Updated</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Description</h3>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          </div>

          {ticket.tags && ticket.tags.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ticket.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Assignment Management</h3>
            </div>
            <TicketAssignmentManager 
              ticketId={ticket.id}
              currentAssigneeId={ticket.assignee?.id || null}
              currentAssigneeName={ticket.assignee?.name || null}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}