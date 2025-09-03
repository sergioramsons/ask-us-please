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
  const [conversationExpanded, setConversationExpanded] = useState(true);

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
      // Ensure conversation is expanded when replies are loaded
      setConversationExpanded(true);
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="h-full bg-gray-50">
      {/* Freshdesk-style Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack} 
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium text-gray-900">{ticket.title}</h1>
              <span className="text-sm text-gray-500">
                #{ticket.ticketNumber || ticket.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Ticket Info Bar */}
        <div className="px-6 py-2 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span><strong>Status:</strong> <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(ticket.status)}`}>{ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}</span></span>
            <span><strong>Priority:</strong> {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}</span>
            <span><strong>Type:</strong> {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1).replace('-', ' ')}</span>
            <span><strong>Created:</strong> {formatDate(ticket.createdAt)}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-3 border-gray-300 hover:bg-gray-50"
            >
              Reply
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 px-3 border-gray-300 hover:bg-gray-50"
            >
              Forward
            </Button>
            <Select value={ticket.status} onValueChange={(value) => onStatusChange(ticket.id, value)}>
              <SelectTrigger className="w-28 h-8 border-gray-300">
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
      <div className="flex h-[calc(100vh-140px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white mr-6">
          
          {/* Original Request */}
          <div className="border-b border-gray-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-500 text-white font-medium">
                    {ticket.customer.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-gray-900">{ticket.customer.name}</span>
                    <span className="text-gray-500">&lt;{ticket.customer.email}&gt;</span>
                    <span className="text-sm text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {ticket.description}
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
                  <p className="text-gray-500">Loading conversation...</p>
                </div>
              ) : replies.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-sm font-medium text-gray-700">
                      Conversation ({replies.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConversationExpanded(!conversationExpanded)}
                      className="h-6 px-2 text-gray-500 hover:text-gray-700"
                    >
                      {conversationExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {conversationExpanded && (
                    <div className="space-y-6">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex gap-4 border-b border-gray-100 pb-4 last:border-b-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={`font-medium ${
                              reply.contact_id 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-green-500 text-white'
                            }`}>
                              {reply.contact_id ? 'C' : 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">
                                {reply.contact_id ? ticket.customer.name : 'Support Agent'}
                              </span>
                              {reply.is_internal && (
                                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Private Note</Badge>
                              )}
                              <span className="text-sm text-gray-500">
                                {formatDate(reply.created_at)}
                              </span>
                            </div>
                            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                              {getReplyText(reply.content) || '(no content)'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No conversation yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Response Form */}
          <div className="border-t border-gray-200 bg-white p-6">
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
        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0">
          {/* Properties Panel */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Properties</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block uppercase">Status</label>
                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(ticket.status)}`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                </span>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block uppercase">Priority</label>
                <span className="text-sm text-gray-900">
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block uppercase">Type</label>
                <span className="text-sm text-gray-900">
                  {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1).replace('-', ' ')}
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block uppercase">Group</label>
                <Select value={currentDepartment || 'unassigned'} onValueChange={handleDepartmentChange}>
                  <SelectTrigger className="h-8 text-sm border-gray-300">
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
                  <label className="text-xs font-medium text-gray-500 mb-2 block uppercase">Source</label>
                  <span className="text-sm text-gray-900">{ticket.source.charAt(0).toUpperCase() + ticket.source.slice(1)}</span>
                </div>
              )}

              {/* Assignment */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block uppercase">Assignee</label>
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
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Requester</h3>
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-500 text-white font-medium">
                  {ticket.customer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 mb-2">{ticket.customer.name}</h4>
                <div className="space-y-1 text-sm text-gray-600">
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
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Additional Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{formatDate(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-900">{formatDate(ticket.updatedAt)}</span>
              </div>
              {ticket.resolvedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Resolved</span>
                    <span className="text-gray-900">{formatDate(ticket.resolvedAt)}</span>
                  </div>
                  {calculateResolutionTime() && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Resolution Time</span>
                      <span className="text-gray-900">{calculateResolutionTime()} hours</span>
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