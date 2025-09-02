import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ticket, TicketReply, TicketAttachment } from '@/types/ticket';
import { TicketResponseForm } from './TicketResponseForm';
import { TicketAssignmentManager } from './TicketAssignmentManager';
import { useDepartments } from '@/hooks/useDepartments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Tag, 
  AlertTriangle,
  Paperclip,
  MessageSquare,
  CheckCircle,
  XCircle,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { parseMultipartEmail } from '@/lib/emailParser';

interface EnhancedTicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onDepartmentChange?: (ticketId: string, departmentId: string | null) => void;
}

export function EnhancedTicketDetail({ ticket, onBack, onStatusChange, onDepartmentChange }: EnhancedTicketDetailProps) {
  const { toast } = useToast();
  const { departments, fetchDepartments } = useDepartments();
  const [replies, setReplies] = useState<any[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(true);
  const [currentDepartment, setCurrentDepartment] = useState<string | null>((ticket as any).department_id || null);

  // Load departments on mount
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Load replies from database
  const loadReplies = async () => {
    try {
      console.log('Loading replies for ticket:', ticket.id);
      
      // First get replies
      const { data: replies, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      console.log('Replies query result:', { replies, error });

      if (error) {
        console.error('Error fetching replies:', error);
        throw error;
      }

      if (!replies || replies.length === 0) {
        console.log('No replies found for ticket');
        setReplies([]);
        return;
      }

      console.log(`Found ${replies.length} replies`);

      // Get unique user IDs
      const userIds = [...new Set(replies.map(reply => reply.user_id).filter(Boolean))];
      console.log('User IDs from replies:', userIds);
      
      if (userIds.length === 0) {
        console.log('No user IDs found, setting replies without profiles');
        setReplies(replies.map(reply => ({ ...reply, profile: null })));
        return;
      }

      // Get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      console.log('Profiles query result:', { profiles, profilesError });

      // Merge profiles with replies
      const repliesWithProfiles = replies.map(reply => ({
        ...reply,
        content: reply.content || '',
        profile: profiles?.find(p => p.user_id === reply.user_id) || null
      }));

      console.log('Final replies with profiles:', repliesWithProfiles);
      setReplies(repliesWithProfiles);
    } catch (error) {
      console.error('Error loading replies:', error);
      toast({
        title: "Error Loading Replies",
        description: "Could not load ticket replies. Please try again.",
        variant: "destructive"
      });
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  };

  // Load replies on mount and subscribe to real-time updates
  useEffect(() => {
    console.log('EnhancedTicketDetail mounted for ticket:', ticket.id);
    loadReplies();
    
    // Subscribe to real-time updates for new replies
    const channel = supabase
      .channel('ticket-replies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${ticket.id}`
        },
        (payload) => {
          console.log('New reply received via realtime:', payload);
          loadReplies();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription for ticket:', ticket.id);
      supabase.removeChannel(channel);
    };
  }, [ticket.id]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'PPP p');
  };

  const getReplyText = (raw: string) => {
    try {
      const parsed = parseMultipartEmail(raw || '');
      return (parsed.text || raw || '').trim();
    } catch {
      return raw || '';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'major': return 'bg-orange-500 text-white';
      case 'minor': return 'bg-yellow-500 text-black';
      case 'minimal': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleAssignmentChange = (newAssigneeId: string | null, newAssigneeName: string) => {
    // This would typically trigger a parent component update
    // For now, we'll just handle it locally since we need to pass this up
    console.log('Assignment changed:', newAssigneeId, newAssigneeName);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white';
      case 'in-progress': return 'bg-yellow-500 text-black';
      case 'resolved': return 'bg-green-500 text-white';
      case 'closed': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const calculateResolutionTime = () => {
    if (!ticket.resolvedAt) return null;
    const created = new Date(ticket.createdAt);
    const resolved = new Date(ticket.resolvedAt);
    const diffHours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours.toFixed(1);
  };

  const handleResponseSubmit = (response: string, isInternal: boolean) => {
    // Optimistically add the new reply, then reload from DB
    setReplies(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        ticket_id: ticket.id,
        content: response,
        is_internal: isInternal,
        user_id: null,
        created_at: new Date().toISOString(),
        profile: null
      }
    ]);
    loadReplies();
  };

  return (
    <div className="h-full bg-background">
      {/* Freshdesk Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-muted/50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-medium text-foreground truncate">{ticket.title}</h1>
                <Badge variant="outline" className="text-xs font-normal">
                  #{ticket.ticketNumber || ticket.id.slice(0, 8)}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>Created {formatDate(ticket.createdAt)}</span>
                <span>•</span>
                <span>Updated {formatDate(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>
          
          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="border-border hover:bg-muted/50"
              onClick={() => {
                const repliesEl = document.getElementById('replies-section');
                repliesEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Reply
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-border hover:bg-muted/50"
            >
              Forward
            </Button>
            <Select value={ticket.status} onValueChange={(value) => onStatusChange(ticket.id, value)}>
              <SelectTrigger className="w-32 h-8">
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

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          
          {/* Original Request */}
          <div className="border-b bg-gray-50/50">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    {ticket.customer.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-foreground">{ticket.customer.name}</span>
                    <span className="text-muted-foreground">&lt;{ticket.customer.email}&gt;</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {repliesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading conversation...</p>
                </div>
              ) : replies.length > 0 ? (
                <div className="space-y-6">
                  <div className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Conversation ({replies.length})
                  </div>
                  {replies.map((reply) => (
                    <div key={reply.id} className="flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={`font-medium ${
                          reply.contact_id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {reply.contact_id ? 'C' : 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-foreground">
                            {reply.contact_id ? ticket.customer.name : 'Support Agent'}
                          </span>
                          {reply.is_internal && (
                            <Badge variant="secondary" className="text-xs">Private Note</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(reply.created_at)}
                          </span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                            {getReplyText(reply.content) || '(no content)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">No conversation yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Response Form */}
          <div className="border-t bg-white p-6">
            <TicketResponseForm 
              ticketId={ticket.id}
              ticketNumber={ticket.ticketNumber}
              customerName={ticket.customer.name}
              customerEmail={ticket.customer.email}
              ticketSubject={ticket.title}
              ticketStatus={ticket.status}
              priority={ticket.priority}
              onSubmit={handleResponseSubmit}
            />
          </div>
        </div>

        {/* Properties Sidebar */}
        <div className="w-80 bg-white border-l flex-shrink-0">
          {/* Properties Panel */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-semibold text-foreground mb-4">Properties</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
                <Badge className={`${getStatusColor(ticket.status)} text-xs font-normal`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                </Badge>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Priority</label>
                <Badge variant="outline" className="text-xs font-normal">
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </Badge>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
                <Badge variant="secondary" className="text-xs font-normal">
                  {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1).replace('-', ' ')}
                </Badge>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Group</label>
                <Select value={currentDepartment || 'unassigned'} onValueChange={handleDepartmentChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select group..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ticket.source && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Source</label>
                  <span className="text-sm text-foreground">{ticket.source.charAt(0).toUpperCase() + ticket.source.slice(1)}</span>
                </div>
              )}

              {/* Assignment */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Assignee</label>
                <TicketAssignmentManager
                  ticketId={ticket.id}
                  currentAssigneeId={ticket.assignee?.id}
                  currentAssigneeName={ticket.assignee?.name}
                  onAssignmentChange={handleAssignmentChange}
                />
              </div>

              {/* SLA Status */}
              {ticket.slaBreached && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">SLA Status</label>
                  <Badge variant="destructive" className="text-xs font-normal">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Breached
                  </Badge>
                </div>
              )}

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Requester Information */}
          <div className="p-6 border-b">
            <h3 className="text-sm font-semibold text-foreground mb-4">Requester</h3>
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  {ticket.customer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1">{ticket.customer.name}</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{ticket.customer.email}</span>
                  </div>
                  {ticket.customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{ticket.customer.phone}</span>
                    </div>
                  )}
                  {ticket.customer.company && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span className="truncate">{ticket.customer.company}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Additional Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{formatDate(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-foreground">{formatDate(ticket.updatedAt)}</span>
              </div>
              {ticket.resolvedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved</span>
                    <span className="text-foreground">{formatDate(ticket.resolvedAt)}</span>
                  </div>
                  {calculateResolutionTime() && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolution Time</span>
                      <span className="text-foreground">{calculateResolutionTime()} hours</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Satisfaction Rating */}
            {ticket.resolution?.customerSatisfaction && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Customer Satisfaction</span>
                </div>
                <div className="text-sm text-green-700">
                  Rating: {ticket.resolution.customerSatisfaction.rating}/5
                  {ticket.resolution.customerSatisfaction.feedback && (
                    <div className="mt-1 text-xs">"{ticket.resolution.customerSatisfaction.feedback}"</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}