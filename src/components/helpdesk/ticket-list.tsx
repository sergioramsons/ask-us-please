import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, TicketStatus } from "@/types/ticket";
import { Search, LayoutGrid, List, Inbox, Filter, Eye } from "lucide-react";
import { TicketFiltersPanel } from "./TicketFiltersPanel";
import { TicketViews } from "./TicketViews";
import { TicketCard } from "./TicketCard";
import { TicketTable } from "./TicketTable";
import { TicketInbox } from "./TicketInbox";

interface TicketListProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onTicketDeleted?: () => void;
  selectionMode?: boolean;
  selectedTicketIds?: Set<string>;
  onToggleSelection?: (ticketId: string) => void;
  onBulkDelete?: (ticketIds: string[]) => void;
}

type ViewLayout = 'card' | 'table' | 'inbox';
type SortOrder = 'newest' | 'oldest';

export function TicketList({ 
  tickets, 
  onViewTicket, 
  onTicketDeleted, 
  selectionMode = false, 
  selectedTicketIds = new Set(), 
  onToggleSelection,
  onBulkDelete 
}: TicketListProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('Date created');
  const [showFilters, setShowFilters] = useState(true);
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Helper function to get avatar color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Helper function to check if ticket is overdue
  const isOverdue = (ticket: Ticket) => {
    const now = new Date();
    const created = new Date(ticket.createdAt);
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 7 && ticket.status !== 'resolved' && ticket.status !== 'closed';
  };

  // Helper function to format date like Freshdesk
  const formatTicketDate = (date: Date) => {
    const now = new Date();
    const ticketDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - ticketDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffMonths === 1) return 'a month ago';
    return `${diffMonths} months ago`;
  };

  // Filter and sort tickets
  const processedTickets = tickets
    .filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Apply additional filters from filters panel
      let matchesFilters = true;
      if (appliedFilters.status && appliedFilters.status !== 'all') {
        matchesFilters = matchesFilters && ticket.status === appliedFilters.status;
      }
      if (appliedFilters.priority && appliedFilters.priority !== 'all') {
        matchesFilters = matchesFilters && ticket.priority === appliedFilters.priority;
      }
      
      return matchesSearch && matchesFilters;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  const renderTicketList = () => {
    if (processedTickets.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <div className="mb-4">
            <Eye className="h-12 w-12 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">No tickets found</h3>
          <p>No tickets match your current filters.</p>
        </div>
      );
    }

    return (
      <div className="space-y-0 border-t">
        {processedTickets.map((ticket, index) => {
          const overdue = isOverdue(ticket);
          return (
            <div
              key={ticket.id}
              className={`flex items-center p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                selectedTicketIds.has(ticket.id) ? 'bg-blue-50' : ''
              }`}
              onClick={() => onViewTicket(ticket)}
            >
              {/* Checkbox for selection */}
              {selectionMode && (
                <div className="mr-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedTicketIds.has(ticket.id)}
                    onChange={() => onToggleSelection?.(ticket.id)}
                    className="rounded border-gray-300"
                  />
                </div>
              )}

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-4 ${getAvatarColor(ticket.customer.name)}`}>
                {getInitials(ticket.customer.name)}
              </div>

              {/* Ticket Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    {/* Status and Title Row */}
                    <div className="flex items-center gap-2 mb-1">
                      {overdue && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                          Overdue
                        </span>
                      )}
                      {ticket.status === 'resolved' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                          Resolved
                        </span>
                      )}
                      <h3 className="font-medium text-gray-900 truncate">
                        {ticket.title}
                      </h3>
                      <span className="text-gray-500 text-sm shrink-0">
                        #{(ticket as any).ticket_number || `${ticket.id.slice(-6)}`}
                      </span>
                    </div>

                    {/* Customer and Date Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{ticket.customer.name}</span>
                      <span>•</span>
                      <span>Created: {formatTicketDate(ticket.createdAt)}</span>
                      {overdue && (
                        <>
                          <span>•</span>
                          <span className="text-red-600">Overdue by: {Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24) - 7)} days</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side indicators */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Priority indicator */}
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        ticket.priority === 'high' ? 'bg-red-500' : 
                        ticket.priority === 'medium' ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`} />
                      <span className="text-sm text-gray-500 capitalize">
                        {ticket.priority || 'Low'}
                      </span>
                    </div>

                    {/* Assignee */}
                    <div className="text-sm text-gray-500 min-w-0">
                      <span className="truncate">-- / {ticket.customer.name.split(' ')[0]}...</span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        ticket.status === 'open' ? 'bg-green-500' :
                        ticket.status === 'resolved' ? 'bg-gray-400' :
                        'bg-blue-500'
                      }`} />
                      <span className="text-sm text-gray-700 capitalize min-w-16">
                        {ticket.status || 'Open'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full bg-white">
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Toolbar */}
          <div className="border-b bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">All tickets</span>
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {processedTickets.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <span className="mr-1">🔍</span>
                  New
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Button>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort by:" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Date created">Date created</SelectItem>
                    <SelectItem value="Last modified">Last modified</SelectItem>
                    <SelectItem value="Priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>Layout:</span>
                  <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200">
                    Card view
                  </Button>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
                <div className="text-sm text-gray-500">
                  1 - {Math.min(14, processedTickets.length)} of {processedTickets.length}
                </div>
              </div>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {renderTicketList()}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="w-80 border-l bg-white">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  FILTERS
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">2</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
            <TicketFiltersPanel
              onFiltersChange={setAppliedFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}