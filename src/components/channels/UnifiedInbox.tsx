import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, 
  MessageCircle, 
  Phone, 
  MessageSquare, 
  Facebook, 
  Twitter, 
  Instagram,
  Globe,
  Search,
  Filter,
  Clock,
  User,
  Star,
  Archive,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { NotificationService } from '@/services/NotificationService';
import { parseMultipartEmail } from '@/lib/emailParser';

interface UnifiedTicket {
  id: string;
  channel: 'email' | 'chat' | 'phone' | 'sms' | 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'portal';
  subject: string;
  content: string;
  customer: {
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  lastActivity: Date;
  unread: boolean;
  tags: string[];
  responses: number;
}

const ChannelIcons = {
  email: Mail,
  chat: MessageCircle,
  phone: Phone,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  portal: Globe
};

const ChannelColors = {
  email: 'text-blue-500',
  chat: 'text-green-500',
  phone: 'text-purple-500',
  sms: 'text-orange-500',
  whatsapp: 'text-green-600',
  facebook: 'text-blue-600',
  twitter: 'text-sky-500',
  instagram: 'text-pink-500',
  portal: 'text-gray-500'
};

const StatusColors = {
  new: 'bg-blue-500',
  open: 'bg-yellow-500',
  pending: 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500'
};

const PriorityColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  urgent: 'text-red-600'
};

export function UnifiedInbox() {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const [tickets, setTickets] = useState<UnifiedTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [readTickets, setReadTickets] = useState<Set<string>>(new Set());
  const [readsLoaded, setReadsLoaded] = useState(false);

  // Persist read tickets per user+organization in localStorage
  const storageKey = user?.id ? `unifiedInbox:reads:${user.id}:${organization?.id || 'org'}` : null;

  // Load persisted read tickets on mount or when user/org changes
  useEffect(() => {
    if (!user?.id) return;
    const keyCurrent = `unifiedInbox:reads:${user.id}:${organization?.id || 'org'}`;
    const keyFallback = `unifiedInbox:reads:${user.id}:org`;
    try {
      const sets: string[][] = [];
      const raw1 = localStorage.getItem(keyCurrent);
      if (raw1) sets.push(JSON.parse(raw1));
      if (keyCurrent !== keyFallback) {
        const raw2 = localStorage.getItem(keyFallback);
        if (raw2) sets.push(JSON.parse(raw2));
      }
      const merged = new Set(sets.flat());
      if (merged.size > 0) setReadTickets(merged);
    } catch (e) {
      console.warn('Failed to load read tickets from storage', e);
    } finally {
      setReadsLoaded(true);
    }
  }, [user?.id, organization?.id]);

  // Save read tickets whenever they change and sync unread flags
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(readTickets)));
    } catch (e) {
      console.warn('Failed to save read tickets to storage');
    }
    // Sync unread flags on current tickets
    setTickets(prev => prev.map(t => {
      const newUnread = !readTickets.has(t.id);
      return t.unread === newUnread ? t : { ...t, unread: newUnread };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readTickets, storageKey]);

  // Reset all filters and reload data
  const resetFiltersAndReload = () => {
    setSearchQuery('');
    setChannelFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    loadTickets();
  };

  // Auto-clear filters when component mounts
  useEffect(() => {
    setSearchQuery('');
    setChannelFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
  }, []);

  useEffect(() => {
    if (organization?.id && readsLoaded) {
      loadTickets();
    }
  }, [organization?.id, readsLoaded]);

  // Load real tickets from database with optimized query
  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // Optimized query - only load what we need for the list view
      let query = supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          subject,
          description,
          status,
          priority,
          category,
          contact_id,
          assigned_to,
          tags,
          created_at,
          updated_at,
          contacts (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(50); // Limit to 50 most recent tickets

      if (organization?.id) {
        query = query.eq('organization_id', organization.id);
      }

      // If user is not admin, restrict to their department
      if (!isAdmin() && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('department_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profile?.department_id) {
          query = query.eq('department_id', profile.department_id);
          console.log('UnifiedInbox: filtering by department', profile.department_id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get reply counts separately for better performance
      const ticketIds = (data || []).map(ticket => ticket.id);
      let replyCounts = new Map();
      
      if (ticketIds.length > 0) {
        const { data: replyData } = await supabase
          .from('ticket_comments')
          .select('ticket_id')
          .in('ticket_id', ticketIds);
        
        if (replyData) {
          replyCounts = replyData.reduce((acc, reply) => {
            acc.set(reply.ticket_id, (acc.get(reply.ticket_id) || 0) + 1);
            return acc;
          }, new Map());
        }
      }

      // Get assigned agents for tickets that have them
      const assignedUserIds = (data || [])
        .filter(ticket => ticket.assigned_to)
        .map(ticket => ticket.assigned_to);

      let assigneeMap = new Map();
      if (assignedUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', assignedUserIds);
        
        if (profiles) {
          assigneeMap = new Map(profiles.map(p => [p.user_id, p.display_name]));
        }
      }

      // Transform database tickets to UnifiedTicket format
      const transformedTickets: UnifiedTicket[] = (data || []).map(ticket => {
        const contact = ticket.contacts;
        const assigneeName = ticket.assigned_to ? assigneeMap.get(ticket.assigned_to) : undefined;
        
        // Determine channel based on ticket source or default to portal
        let channel: UnifiedTicket['channel'] = 'portal';
        if (ticket.category?.toLowerCase().includes('email')) channel = 'email';
        else if (ticket.category?.toLowerCase().includes('phone')) channel = 'phone';
        else if (ticket.category?.toLowerCase().includes('chat')) channel = 'chat';

        // Clean up MIME/HTML descriptions for display in the list and detail pane
        const cleanedContent = (() => {
          const parsed = parseMultipartEmail(ticket.description || '');
          const text = parsed.text || '';
          // Remove common MIME boilerplate line if present
          return text.replace(/^This is a multipart message in MIME format\.?\s*/i, '').trim();
        })();

        return {
          id: ticket.id,
          channel,
          subject: ticket.subject,
          content: cleanedContent,
          customer: {
            name: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Customer',
            email: contact?.email || '',
            phone: contact?.phone || '',
          },
          status: ticket.status as UnifiedTicket['status'],
          priority: ticket.priority as UnifiedTicket['priority'],
          assignee: assigneeName || undefined,
          lastActivity: new Date(ticket.updated_at),
          unread: !readTickets.has(ticket.id),
          tags: ticket.tags || [],
          responses: replyCounts.get(ticket.id) || 0
        };
      });

      setTickets(transformedTickets);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      toast({
        title: "Error loading tickets",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicket(ticketId);
    // Mark ticket as read
    setReadTickets(prev => {
      const next = new Set(prev);
      next.add(ticketId);
      // Persist immediately to avoid losing state on quick navigation
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
    setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, unread: false } : t)));
  };

  const handleSendReply = async () => {
    if (!selectedTicket) return;
    const ticket = tickets.find(t => t.id === selectedTicket);
    if (!ticket) return;

    if (!replyText.trim()) {
      toast({ title: 'Empty reply', description: 'Please type a message before sending.' });
      return;
    }

    try {
      setSending(true);
      // Insert reply
      const { error: replyError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: selectedTicket,
          user_id: user?.id || null,
          is_internal: false,
          content: replyText.trim(),
        });

      if (replyError) throw replyError;

      // Optimistically update UI
      setTickets(prev => prev.map(t =>
        t.id === selectedTicket
          ? { ...t, responses: (t.responses || 0) + 1, lastActivity: new Date() }
          : t
      ));

      // Notify customer via email if available
      if (ticket.customer.email) {
        await NotificationService.notifyCommentAdded(
          ticket.id,
          ticket.subject,
          ticket.customer.email,
          user?.user_metadata?.display_name || user?.email || 'Support Agent',
          replyText.trim()
        );
      }

      setReplyText('');
      toast({ title: 'Reply sent', description: 'Your response has been added to the ticket.' });
    } catch (error: any) {
      console.error('Failed to send reply:', error);
      toast({ title: 'Failed to send', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChannel = channelFilter === 'all' || ticket.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesChannel && matchesStatus && matchesPriority;
  });

  const getChannelStats = () => {
    const stats = tickets.reduce((acc, ticket) => {
      acc[ticket.channel] = (acc[ticket.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: tickets.length,
      unread: tickets.filter(t => t.unread).length,
      urgent: tickets.filter(t => t.priority === 'urgent').length,
      ...stats
    };
  };

  const stats = getChannelStats();

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return format(date, 'MMM d');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Unified Inbox</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFiltersAndReload}
              className="text-xs"
            >
              Reset Filters & Reload
            </Button>
            <Badge variant="secondary">{stats.total} total</Badge>
            <Badge variant="destructive">{stats.unread} unread</Badge>
            <Badge variant="outline">{stats.urgent} urgent</Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="chat">Live Chat</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Ticket List */}
        <div className="w-1/3 border-r">
          <div className="p-4">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="assigned">Mine</TabsTrigger>
                <TabsTrigger value="urgent">Urgent</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                <div className="overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading tickets...</p>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground">No tickets found</p>
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const ChannelIcon = ChannelIcons[ticket.channel];
                      return (
                        <div
                          key={ticket.id}
                          className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                            selectedTicket === ticket.id ? 'bg-muted' : ''
                          } ${ticket.unread ? 'bg-blue-50' : ''}`}
                          onClick={() => handleTicketClick(ticket.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={ticket.customer.avatar} />
                              <AvatarFallback>
                                {ticket.customer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ChannelIcon className={`h-4 w-4 ${ChannelColors[ticket.channel]}`} />
                                <span className="font-medium text-sm truncate">
                                  {ticket.customer.name}
                                </span>
                                {ticket.unread && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>

                              <h3 className={`font-medium text-sm truncate mb-1 ${
                                ticket.unread ? 'font-semibold' : ''
                              }`}>
                                {ticket.subject}
                              </h3>

                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {ticket.content}
                              </p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className={`text-xs ${StatusColors[ticket.status]} text-white`}
                                    variant="secondary"
                                  >
                                    {ticket.status}
                                  </Badge>
                                  <span className={`text-xs font-medium ${PriorityColors[ticket.priority]}`}>
                                    {ticket.priority}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {ticket.assignee && (
                                    <Badge variant="outline" className="text-xs">
                                      {ticket.assignee}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatLastActivity(ticket.lastActivity)}
                                  </span>
                                  {ticket.responses > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ticket.responses}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="unread" className="mt-0">
                <div className="overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading tickets...</p>
                    </div>
                  ) : filteredTickets.filter(t => t.unread).length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground">No unread tickets</p>
                    </div>
                  ) : (
                    filteredTickets.filter(t => t.unread).map((ticket) => {
                      const ChannelIcon = ChannelIcons[ticket.channel];
                      return (
                        <div
                          key={ticket.id}
                          className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                            selectedTicket === ticket.id ? 'bg-muted' : ''
                          } bg-blue-50`}
                          onClick={() => handleTicketClick(ticket.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={ticket.customer.avatar} />
                              <AvatarFallback>
                                {ticket.customer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ChannelIcon className={`h-4 w-4 ${ChannelColors[ticket.channel]}`} />
                                <span className="font-medium text-sm truncate">
                                  {ticket.customer.name}
                                </span>
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              </div>

                              <h3 className="font-semibold text-sm truncate mb-1">
                                {ticket.subject}
                              </h3>

                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {ticket.content}
                              </p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className={`text-xs ${StatusColors[ticket.status]} text-white`}
                                    variant="secondary"
                                  >
                                    {ticket.status}
                                  </Badge>
                                  <span className={`text-xs font-medium ${PriorityColors[ticket.priority]}`}>
                                    {ticket.priority}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {ticket.assignee && (
                                    <Badge variant="outline" className="text-xs">
                                      {ticket.assignee}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatLastActivity(ticket.lastActivity)}
                                  </span>
                                  {ticket.responses > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ticket.responses}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="assigned" className="mt-0">
                <div className="overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading tickets...</p>
                    </div>
                  ) : filteredTickets.filter(t => t.assignee && t.assignee.includes(user?.user_metadata?.display_name || user?.email || '')).length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground">No tickets assigned to you</p>
                    </div>
                  ) : (
                    filteredTickets.filter(t => t.assignee && t.assignee.includes(user?.user_metadata?.display_name || user?.email || '')).map((ticket) => {
                      const ChannelIcon = ChannelIcons[ticket.channel];
                      return (
                        <div
                          key={ticket.id}
                          className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                            selectedTicket === ticket.id ? 'bg-muted' : ''
                          } ${ticket.unread ? 'bg-blue-50' : ''}`}
                          onClick={() => handleTicketClick(ticket.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={ticket.customer.avatar} />
                              <AvatarFallback>
                                {ticket.customer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ChannelIcon className={`h-4 w-4 ${ChannelColors[ticket.channel]}`} />
                                <span className="font-medium text-sm truncate">
                                  {ticket.customer.name}
                                </span>
                                {ticket.unread && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                                <User className="h-3 w-3 text-green-600" />
                              </div>

                              <h3 className={`font-medium text-sm truncate mb-1 ${
                                ticket.unread ? 'font-semibold' : ''
                              }`}>
                                {ticket.subject}
                              </h3>

                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {ticket.content}
                              </p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className={`text-xs ${StatusColors[ticket.status]} text-white`}
                                    variant="secondary"
                                  >
                                    {ticket.status}
                                  </Badge>
                                  <span className={`text-xs font-medium ${PriorityColors[ticket.priority]}`}>
                                    {ticket.priority}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {ticket.assignee}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatLastActivity(ticket.lastActivity)}
                                  </span>
                                  {ticket.responses > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ticket.responses}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="urgent" className="mt-0">
                <div className="overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading tickets...</p>
                    </div>
                  ) : filteredTickets.filter(t => t.priority === 'urgent').length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground">No urgent tickets</p>
                    </div>
                  ) : (
                    filteredTickets.filter(t => t.priority === 'urgent').map((ticket) => {
                      const ChannelIcon = ChannelIcons[ticket.channel];
                      return (
                        <div
                          key={ticket.id}
                          className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                            selectedTicket === ticket.id ? 'bg-muted' : ''
                          } ${ticket.unread ? 'bg-blue-50' : ''} border-l-4 border-l-red-500`}
                          onClick={() => handleTicketClick(ticket.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={ticket.customer.avatar} />
                              <AvatarFallback>
                                {ticket.customer.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <ChannelIcon className={`h-4 w-4 ${ChannelColors[ticket.channel]}`} />
                                <span className="font-medium text-sm truncate">
                                  {ticket.customer.name}
                                </span>
                                {ticket.unread && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                                <Badge variant="destructive" className="text-xs">URGENT</Badge>
                              </div>

                              <h3 className={`font-medium text-sm truncate mb-1 ${
                                ticket.unread ? 'font-semibold' : ''
                              }`}>
                                {ticket.subject}
                              </h3>

                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {ticket.content}
                              </p>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    className={`text-xs ${StatusColors[ticket.status]} text-white`}
                                    variant="secondary"
                                  >
                                    {ticket.status}
                                  </Badge>
                                  <span className="text-xs font-medium text-red-600">
                                    {ticket.priority}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {ticket.assignee && (
                                    <Badge variant="outline" className="text-xs">
                                      {ticket.assignee}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatLastActivity(ticket.lastActivity)}
                                  </span>
                                  {ticket.responses > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {ticket.responses}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="flex-1">
          {selectedTicket ? (
            <div className="h-full flex flex-col">
              {(() => {
                const ticket = tickets.find(t => t.id === selectedTicket);
                if (!ticket) return null;
                
                const ChannelIcon = ChannelIcons[ticket.channel];
                
                return (
                  <>
                    {/* Ticket Header */}
                    <div className="border-b p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <ChannelIcon className={`h-5 w-5 ${ChannelColors[ticket.channel]}`} />
                          <div>
                            <h2 className="font-semibold">{ticket.subject}</h2>
                            <p className="text-sm text-muted-foreground">
                              {ticket.customer.name} • {formatLastActivity(ticket.lastActivity)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Star className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge className={`${StatusColors[ticket.status]} text-white`}>
                          {ticket.status}
                        </Badge>
                        <Badge variant="outline" className={PriorityColors[ticket.priority]}>
                          {ticket.priority} priority
                        </Badge>
                        {ticket.assignee && (
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-4 w-4" />
                            {ticket.assignee}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ticket Content */}
                    <div className="flex-1 p-4">
                      <div className="bg-muted rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={ticket.customer.avatar} />
                            <AvatarFallback>
                              {ticket.customer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{ticket.customer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatLastActivity(ticket.lastActivity)}
                              </span>
                            </div>
                            <p className="text-sm">{ticket.content}</p>
                          </div>
                        </div>
                      </div>

                      {ticket.responses > 0 && (
                        <div className="text-center text-sm text-muted-foreground mb-4">
                          {ticket.responses} previous responses
                        </div>
                      )}
                    </div>

                    {/* Response Area */}
                    <div className="border-t p-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Type your response..." 
                          className="flex-1"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleSendReply();
                            }
                          }}
                        />
                        <Button onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                          {sending ? 'Sending…' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
