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
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { parseMultipartEmail } from '@/lib/emailParser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      {/* Freshdesk-style Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{ticket.title}</h1>
              <p className="text-sm text-muted-foreground">#{ticket.ticketNumber || ticket.id.slice(0, 8)}</p>
            </div>
          </div>
          
          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Scroll to replies section
                const repliesEl = document.getElementById('replies-section');
                repliesEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Scroll to response form and focus on internal note
                const responseForm = document.querySelector('.response-form-container');
                responseForm?.scrollIntoView({ behavior: 'smooth' });
                // Could trigger internal note mode here
              }}
            >
              Add Note
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                toast({
                  title: "Forward Ticket",
                  description: "Forward functionality will be available soon."
                });
              }}
            >
              Forward
            </Button>
            <Select value={ticket.status} onValueChange={(value) => onStatusChange(ticket.id, value)}>
              <SelectTrigger className="w-32">
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

      {/* Three-column layout */}
      <div className="flex h-[calc(100vh-140px)]">
        {/* Main Content - Ticket Body */}
        <div className="flex-1 flex flex-col bg-card border-r">
          {/* Ticket Description */}
          <div className="p-4 border-b">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Conversation/Replies */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="conversation" className="w-full">
              <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b">
                <div className="p-2">
                  <TabsList>
                    <TabsTrigger value="conversation">
                      Conversation
                      <Badge variant="outline" className="ml-2 text-xs">
                        {repliesLoading ? '…' : replies.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              <TabsContent value="conversation" className="m-0">
                <div id="replies-section" className="p-4 min-h-[200px]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">Conversation</h3>
                    <Badge variant="outline" className="text-xs">
                      {repliesLoading ? 'Loading…' : `Replies (${replies.length})`}
                    </Badge>
                  </div>
                  {repliesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading replies...</p>
                    </div>
                  ) : replies.length > 0 ? (
                    <div className="space-y-4">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs">
                              {reply.contact_id ? 'C' : 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {reply.contact_id ? 'Customer' : 'Support'}
                              </span>
                              {reply.is_internal && (
                                <Badge variant="secondary" className="text-xs">Internal</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 border border-border shadow-sm">
                              <p className="text-sm whitespace-pre-wrap break-words text-foreground">
                                {getReplyText(reply.content) || '(no content)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No replies yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Response Form */}
          <div className="border-t bg-muted/20 p-4 response-form-container">
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

        {/* Properties Widget */}
        <div className="w-80 bg-card border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3">Properties</h3>
            
            {/* Status and Priority */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                </Badge>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                <Badge variant="outline">
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </Badge>
              </div>

              {ticket.severity && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
                  <Badge className={getSeverityColor(ticket.severity)}>
                    {ticket.severity.charAt(0).toUpperCase() + ticket.severity.slice(1)}
                  </Badge>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <Badge variant="secondary">
                  {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1).replace('-', ' ')}
                </Badge>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Department</label>
                <Select value={currentDepartment || 'unassigned'} onValueChange={handleDepartmentChange}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
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
                  <label className="text-xs text-muted-foreground mb-1 block">Source</label>
                  <span className="text-sm">{ticket.source.charAt(0).toUpperCase() + ticket.source.slice(1)}</span>
                </div>
              )}

              {/* SLA and Escalation */}
              {(ticket.slaBreached || ticket.escalationLevel > 0) && (
                <div className="space-y-2">
                  {ticket.slaBreached && (
                    <div>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        SLA Breached
                      </Badge>
                    </div>
                  )}
                  {ticket.escalationLevel > 0 && (
                    <div>
                      <Badge variant="secondary">
                        Escalation Level: {ticket.escalationLevel}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3">Assignment</h3>
            <TicketAssignmentManager 
              ticketId={ticket.id}
              currentAssigneeId={ticket.assignee?.id || null}
              currentAssigneeName={ticket.assignee?.name || null}
              onAssignmentChange={handleAssignmentChange}
            />
          </div>

          {/* Time Information */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3">Timestamps</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>
                <p className="font-medium">{formatDate(ticket.updatedAt)}</p>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <span className="text-muted-foreground">Resolved:</span>
                  <p className="font-medium">{formatDate(ticket.resolvedAt)}</p>
                </div>
              )}
              {calculateResolutionTime() && (
                <div>
                  <span className="text-muted-foreground">Resolution time:</span>
                  <p className="font-medium">{calculateResolutionTime()} hours</p>
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields */}
          {ticket.customFields && Object.keys(ticket.customFields).length > 0 && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold mb-3">Custom Fields</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(ticket.customFields).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted-foreground capitalize">{key}:</span>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Apps Pane */}
        <div className="w-80 bg-muted/20 overflow-y-auto">

          {/* Contact Details */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold mb-3">Contact Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {ticket.customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{ticket.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{ticket.customer.email}</p>
                </div>
              </div>
              
              {ticket.customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.customer.phone}</span>
                </div>
              )}
              
              {ticket.customer.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{ticket.customer.company}</span>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold mb-3">Attachments ({ticket.attachments.length})</h3>
              <div className="space-y-2">
                {ticket.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 p-2 bg-background rounded text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.filesize / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Details */}
          {ticket.resolution && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Resolution
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Resolved by:</span>
                  <p className="font-medium">{ticket.resolution.resolvedBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolution time:</span>
                  <p className="font-medium">{ticket.resolution.resolutionTime} minutes</p>
                </div>
                {ticket.resolution.resolutionNotes && (
                  <div>
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="text-sm mt-1">{ticket.resolution.resolutionNotes}</p>
                  </div>
                )}
                {ticket.resolution.customerSatisfaction && (
                  <div>
                    <span className="text-muted-foreground">Satisfaction:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        ⭐ {ticket.resolution.customerSatisfaction.rating}/5
                      </Badge>
                      {ticket.resolution.customerSatisfaction.feedback && (
                        <p className="text-xs italic">"{ticket.resolution.customerSatisfaction.feedback}"</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}