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
  const [tickets, setTickets] = useState<UnifiedTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Mock data - in real implementation this would come from your database
  useEffect(() => {
    const mockTickets: UnifiedTicket[] = [
      {
        id: '1',
        channel: 'email',
        subject: 'Cannot access my account',
        content: 'I have been trying to log into my account but keep getting an error message...',
        customer: {
          name: 'John Smith',
          email: 'john@example.com',
          avatar: '/placeholder.svg'
        },
        status: 'new',
        priority: 'high',
        assignee: 'Sarah Wilson',
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        unread: true,
        tags: ['account', 'login'],
        responses: 0
      },
      {
        id: '2',
        channel: 'chat',
        subject: 'Live Chat Session',
        content: 'Hi, I need help with my recent order. The delivery status shows...',
        customer: {
          name: 'Emma Davis',
          email: 'emma@example.com'
        },
        status: 'open',
        priority: 'medium',
        assignee: 'Mike Johnson',
        lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        unread: false,
        tags: ['order', 'delivery'],
        responses: 3
      },
      {
        id: '3',
        channel: 'facebook',
        subject: 'Facebook Message',
        content: 'Your product quality has decreased recently. Very disappointed...',
        customer: {
          name: 'Robert Brown',
          avatar: '/placeholder.svg'
        },
        status: 'pending',
        priority: 'urgent',
        lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        unread: true,
        tags: ['complaint', 'quality'],
        responses: 1
      },
      {
        id: '4',
        channel: 'phone',
        subject: 'Phone Call - Billing Issue',
        content: 'Customer called regarding incorrect charges on their bill...',
        customer: {
          name: 'Lisa Johnson',
          phone: '+1234567890'
        },
        status: 'resolved',
        priority: 'medium',
        assignee: 'David Lee',
        lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        unread: false,
        tags: ['billing', 'phone'],
        responses: 2
      },
      {
        id: '5',
        channel: 'twitter',
        subject: '@customer_tweet',
        content: '@yourcompany Why is your service down? This is the third time this month!',
        customer: {
          name: 'Alex Miller',
          avatar: '/placeholder.svg'
        },
        status: 'open',
        priority: 'high',
        assignee: 'Social Media Team',
        lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        unread: true,
        tags: ['social', 'outage'],
        responses: 0
      }
    ];
    setTickets(mockTickets);
  }, []);

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
            </Tabs>
          </div>

          <div className="overflow-y-auto">
            {filteredTickets.map((ticket) => {
              const ChannelIcon = ChannelIcons[ticket.channel];
              return (
                <div
                  key={ticket.id}
                  className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                    selectedTicket === ticket.id ? 'bg-muted' : ''
                  } ${ticket.unread ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedTicket(ticket.id)}
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
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatLastActivity(ticket.lastActivity)}
                        </div>
                      </div>

                      {ticket.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {ticket.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                        />
                        <Button>Send</Button>
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