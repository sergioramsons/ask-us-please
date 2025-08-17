import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Calendar, User, AlertCircle, CheckCircle, Clock, Eye } from "lucide-react";
import { Ticket, TicketStatus } from "@/types/ticket";
import { format } from "date-fns";

export function CustomerTicketHistory() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockTickets: Ticket[] = [
      {
        id: "1",
        title: "Login Issues",
        description: "Unable to login to my account after password reset",
        status: "resolved" as TicketStatus,
        priority: "high",
        category: "technical",
        severity: "minor",
        source: "email",
        customer: {
          name: user?.email?.split('@')[0] || "Customer",
          email: user?.email || "",
          company: "ABC Corp"
        },
        assignee: {
          id: "admin1",
          name: "John Support",
          email: "john@support.com"
        },
        tags: ["login", "password"],
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 86400000),
        comments: [
          {
            id: "1",
            content: "I've reset your password. Please try logging in again.",
            author: {
              id: "admin1",
              name: "John Support",
              email: "john@support.com"
            },
            isInternal: false,
            createdAt: new Date(Date.now() - 86400000)
          }
        ],
        attachments: [],
        resolution: {
          resolvedAt: new Date(Date.now() - 86400000),
          resolvedBy: "John Support",
          resolutionNotes: "Password reset successfully completed",
          resolutionTime: 120
        },
        watchers: [],
        slaBreached: false,
        escalationLevel: 0,
        customFields: {}
      },
      {
        id: "2",
        title: "Feature Request: Dark Mode",
        description: "Would love to have a dark mode option in the application",
        status: "in-progress" as TicketStatus,
        priority: "low",
        category: "feature-request",
        severity: "minimal",
        source: "email",
        customer: {
          name: user?.email?.split('@')[0] || "Customer",
          email: user?.email || "",
          company: "ABC Corp"
        },
        assignee: {
          id: "dev1",
          name: "Sarah Dev",
          email: "sarah@dev.com"
        },
        tags: ["ui", "enhancement"],
        createdAt: new Date(Date.now() - 86400000 * 5),
        updatedAt: new Date(Date.now() - 86400000 * 2),
        comments: [
          {
            id: "2",
            content: "We're working on this feature. Expected completion next month.",
            author: {
              id: "dev1",
              name: "Sarah Dev",
              email: "sarah@dev.com"
            },
            isInternal: false,
            createdAt: new Date(Date.now() - 86400000 * 2)
          }
        ],
        attachments: [],
        watchers: [],
        slaBreached: false,
        escalationLevel: 0,
        customFields: {}
      }
    ];
    
    setTickets(mockTickets);
    setLoading(false);
  }, [user]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
            ← Back to Tickets
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedTicket.status)}
                  {selectedTicket.title}
                </CardTitle>
                <CardDescription>
                  Ticket #{selectedTicket.ticketNumber || selectedTicket.id.slice(0, 8)} • Created {format(selectedTicket.createdAt, 'PPP')}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(selectedTicket.status)}>
                {selectedTicket.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{selectedTicket.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-1">Priority</h4>
                <Badge variant="outline">{selectedTicket.priority}</Badge>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Category</h4>
                <Badge variant="outline">{selectedTicket.category}</Badge>
              </div>
            </div>
            
            {selectedTicket.assignee && (
              <div>
                <h4 className="font-semibold mb-2">Assigned To</h4>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedTicket.assignee.name}</span>
                </div>
              </div>
            )}
            
            {selectedTicket.comments && selectedTicket.comments.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Comments</h4>
                <div className="space-y-4">
                  {selectedTicket.comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-muted pl-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{comment.author.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(comment.createdAt, 'PPp')}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedTicket.resolution && (
              <div>
                <h4 className="font-semibold mb-2">Resolution</h4>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200">{selectedTicket.resolution.resolutionNotes}</p>
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    Resolved by {selectedTicket.resolution.resolvedBy} on {format(selectedTicket.resolution.resolvedAt, 'PPp')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Support Tickets</CardTitle>
          <CardDescription>
            View and track all your support requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" ? "No tickets match your search criteria." : "You haven't submitted any tickets yet."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <h3 className="font-semibold">{ticket.title}</h3>
                          <Badge className={getStatusColor(ticket.status)} variant="secondary">
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(ticket.createdAt, 'PPP')}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {ticket.priority}
                          </Badge>
                          {ticket.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.assignee.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}