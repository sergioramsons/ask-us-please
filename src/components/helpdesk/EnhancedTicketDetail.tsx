import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Ticket, TicketComment, TicketAttachment } from '@/types/ticket';
import { TicketResponseForm } from './TicketResponseForm';
import { TicketAssignmentManager } from './TicketAssignmentManager';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
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

interface EnhancedTicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onStatusChange: (ticketId: string, newStatus: string) => void;
}

export function EnhancedTicketDetail({ ticket, onBack, onStatusChange }: EnhancedTicketDetailProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Load comments from database
  const loadComments = async () => {
    try {
      // First get comments
      const { data: comments, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!comments || comments.length === 0) {
        setComments([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(comments.map(comment => comment.created_by).filter(Boolean))];
      
      if (userIds.length === 0) {
        setComments(comments.map(comment => ({ ...comment, profile: null })));
        return;
      }

      // Get profiles for those users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Merge profiles with comments
      const commentsWithProfiles = comments.map(comment => ({
        ...comment,
        profile: profiles?.find(p => p.user_id === comment.created_by) || null
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [ticket.id]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'PPP p');
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
    // Optimistically add the new comment, then reload from DB
    setComments(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        ticket_id: ticket.id,
        content: response,
        is_internal: isInternal,
        created_by: null,
        created_at: new Date().toISOString(),
        profile: null
      }
    ]);
    loadComments();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <p className="text-muted-foreground">Ticket #{ticket.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </div>

              {/* Status and Priority */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                </Badge>
                <Badge variant="outline">
                  Priority: {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </Badge>
                {ticket.severity && (
                  <Badge className={getSeverityColor(ticket.severity)}>
                    {ticket.severity.charAt(0).toUpperCase() + ticket.severity.slice(1)}
                  </Badge>
                )}
                <Badge variant="secondary">
                  {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1).replace('-', ' ')}
                </Badge>
                {ticket.source && (
                  <Badge variant="outline">
                    Source: {ticket.source.charAt(0).toUpperCase() + ticket.source.slice(1)}
                  </Badge>
                )}
              </div>

              {/* SLA and Escalation */}
              {(ticket.slaBreached || ticket.escalationLevel > 0) && (
                <div className="flex gap-2">
                  {ticket.slaBreached && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      SLA Breached
                    </Badge>
                  )}
                  {ticket.escalationLevel > 0 && (
                    <Badge variant="secondary">
                      Escalation Level: {ticket.escalationLevel}
                    </Badge>
                  )}
                </div>
              )}

              {/* Tags */}
              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Fields */}
              {ticket.customFields && Object.keys(ticket.customFields).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Custom Fields</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(ticket.customFields).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground capitalize">{key}:</span>
                        <span className="ml-2 font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolution Information */}
          {ticket.resolution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Resolution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Resolution Notes:</p>
                  <p className="text-sm">{ticket.resolution.resolutionNotes}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Resolved by:</span>
                    <span className="ml-2 font-medium">{ticket.resolution.resolvedBy}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolution time:</span>
                    <span className="ml-2 font-medium">{ticket.resolution.resolutionTime} minutes</span>
                  </div>
                </div>
                {ticket.resolution.customerSatisfaction && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Customer Satisfaction:</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        ⭐ {ticket.resolution.customerSatisfaction.rating}/5
                      </Badge>
                      {ticket.resolution.customerSatisfaction.feedback && (
                        <span className="text-sm italic">"{ticket.resolution.customerSatisfaction.feedback}"</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commentsLoading ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Loading comments...</p>
                </div>
              ) : comments.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                           <Avatar className="h-8 w-8">
                             <AvatarFallback>
                               {comment.profile?.display_name ? 
                                 comment.profile.display_name.split(' ').map((n: string) => n[0]).join('') : 
                                 'U'
                               }
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex-1">
                             <div className="flex items-center gap-2">
                               <span className="font-medium">
                                 {comment.profile?.display_name || 'User'}
                               </span>
                              {comment.is_internal && (
                                <Badge variant="secondary" className="text-xs">Internal</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(comment.created_at)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                 <p className="text-center text-muted-foreground py-4">
                   No comments yet. Be the first to respond!
                 </p>
               )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments ({ticket.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ticket.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.filesize / 1024).toFixed(1)} KB • {attachment.contentType}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Response Form */}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{ticket.customer.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{ticket.customer.email}</span>
              </div>
              {ticket.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ticket.customer.phone}</span>
                </div>
              )}
              {ticket.customer.company && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ticket.customer.company}</span>
                </div>
              )}
              {ticket.customer.department && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Dept:</span> {ticket.customer.department}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Management */}
          <TicketAssignmentManager
            ticketId={ticket.id}
            currentAssigneeId={ticket.assignee?.id}
            currentAssigneeName={ticket.assignee?.name}
            onAssignmentChange={handleAssignmentChange}
          />

          {/* Assignment */}
          {ticket.assignee && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {ticket.assignee.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{ticket.assignee.name}</p>
                    <p className="text-xs text-muted-foreground">{ticket.assignee.email}</p>
                  </div>
                </div>
                {ticket.assignee.department && (
                  <p className="text-sm text-muted-foreground">
                    Department: {ticket.assignee.department}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">{formatDate(ticket.createdAt)}</p>
                </div>
              </div>
              
              {ticket.firstResponseAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">First Response</p>
                    <p className="text-muted-foreground">{formatDate(ticket.firstResponseAt)}</p>
                  </div>
                </div>
              )}

              {ticket.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Due Date</p>
                    <p className="text-muted-foreground">{formatDate(ticket.dueDate)}</p>
                  </div>
                </div>
              )}

              {ticket.resolvedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium">Resolved</p>
                    <p className="text-muted-foreground">{formatDate(ticket.resolvedAt)}</p>
                    {calculateResolutionTime() && (
                      <p className="text-xs text-green-600">
                        Resolution time: {calculateResolutionTime()} hours
                      </p>
                    )}
                  </div>
                </div>
              )}

              {ticket.closedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Closed</p>
                    <p className="text-muted-foreground">{formatDate(ticket.closedAt)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-muted-foreground">{formatDate(ticket.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status progression buttons */}
              {ticket.status === 'open' && (
                <Button 
                  onClick={() => onStatusChange(ticket.id, 'in-progress')}
                  className="w-full"
                  variant="default"
                >
                  <Timer className="h-4 w-4 mr-2" />
                  Start Working
                </Button>
              )}
              
              {ticket.status === 'in-progress' && (
                <Button 
                  onClick={() => onStatusChange(ticket.id, 'resolved')}
                  className="w-full"
                  variant="default"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
              )}
              
              {ticket.status === 'resolved' && (
                <Button 
                  onClick={() => onStatusChange(ticket.id, 'closed')}
                  className="w-full"
                  variant="default"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Close Ticket
                </Button>
              )}

              {/* Additional status options */}
              {ticket.status !== 'closed' && (
                <>
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Quick Actions:</p>
                    <div className="space-y-2">
                      {ticket.status !== 'open' && (
                        <Button 
                          onClick={() => onStatusChange(ticket.id, 'open')}
                          className="w-full"
                          variant="outline"
                          size="sm"
                        >
                          ↩️ Reopen Ticket
                        </Button>
                      )}
                      
                      {ticket.status !== 'in-progress' && (
                        <Button 
                          onClick={() => onStatusChange(ticket.id, 'in-progress')}
                          className="w-full"
                          variant="outline"
                          size="sm"
                        >
                          🔄 Move to In Progress
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => onStatusChange(ticket.id, 'closed')}
                        className="w-full"
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Force Close
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {ticket.status === 'closed' && (
                <div className="text-center py-4">
                  <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Ticket is closed</p>
                  <Button 
                    onClick={() => onStatusChange(ticket.id, 'open')}
                    className="mt-2"
                    variant="outline"
                    size="sm"
                  >
                    Reopen Ticket
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Watchers */}
          {ticket.watchers && ticket.watchers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Watchers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {ticket.watchers.length} user(s) watching this ticket
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}