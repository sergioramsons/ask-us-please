import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, TicketStatus } from "@/types/ticket";
import { Search, LayoutGrid, List, Inbox, Filter, Eye } from "lucide-react";
import { TicketFiltersPanel } from "./TicketFiltersPanel";
import { TicketViews } from "./TicketViews";

interface TicketListProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onTicketDeleted?: () => void;
  selectionMode?: boolean;
  selectedTicketIds?: Set<string>;
  onToggleSelection?: (ticketId: string) => void;
  onBulkDelete?: (ticketIds: string[]) => void;
  currentUserId?: string;
}

export function TicketList({ 
  tickets, 
  onViewTicket, 
  onTicketDeleted, 
  selectionMode = false, 
  selectedTicketIds = new Set(), 
  onToggleSelection,
  onBulkDelete,
  currentUserId 
}: TicketListProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('Date created');
  const [showFilters, setShowFilters] = useState(true);
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [currentViewFilter, setCurrentViewFilter] = useState('all-tickets');

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

  const handleViewFiltersChange = (filters: any) => {
    setAppliedFilters(filters || {});
  };

  const getCurrentUserId = () => {
    // Use the passed currentUserId or fallback to the hardcoded value
    return currentUserId || "8e41a122-621b-4351-947d-bf08e1e51d84";
  };

  // Filter and sort tickets
  const processedTickets = tickets
    .filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           ticket.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Apply additional filters from filters panel and view filters
      let matchesFilters = true;
      if (appliedFilters.status) {
        if (Array.isArray(appliedFilters.status)) {
          matchesFilters = matchesFilters && appliedFilters.status.includes(ticket.status);
        } else if (appliedFilters.status !== 'all') {
          matchesFilters = matchesFilters && ticket.status === appliedFilters.status;
        }
      }
      if (appliedFilters.priority && appliedFilters.priority !== 'all') {
        matchesFilters = matchesFilters && ticket.priority === appliedFilters.priority;
      }
      if (appliedFilters.assignee === 'unassigned') {
        matchesFilters = matchesFilters && !ticket.assignee;
      }
      if (appliedFilters.assignee === 'me') {
        const currentUserId = getCurrentUserId();
        matchesFilters = matchesFilters && ticket.assignee?.id === currentUserId;
      }
      if (appliedFilters.createdBy === 'me') {
        const currentUserId = getCurrentUserId();
        matchesFilters = matchesFilters && (ticket as any).created_by === currentUserId;
      }
      if (appliedFilters.watching === 'me') {
        const currentUserId = getCurrentUserId();
        matchesFilters = matchesFilters && ticket.watchers.includes(currentUserId);
      }
      if (appliedFilters.overdue) {
        matchesFilters = matchesFilters && isOverdue(ticket);
      }
      if (appliedFilters.dateRange === 'today') {
        const today = new Date();
        const statusFilter = appliedFilters.status;
        const checkResolved = statusFilter === 'resolved' || (Array.isArray(statusFilter) && statusFilter.includes('resolved'));
        const dateToCheck = checkResolved
          ? (ticket.resolvedAt ?? ticket.updatedAt ?? ticket.createdAt)
          : ticket.createdAt;
        const isToday = new Date(dateToCheck).toDateString() === today.toDateString();
        matchesFilters = matchesFilters && isToday;
      }
      if (appliedFilters.category && appliedFilters.category !== 'general') {
        matchesFilters = matchesFilters && ticket.category === appliedFilters.category;
      }
      
      return matchesSearch && matchesFilters;
    })
    .sort((a, b) => {
      if (sortOrder === 'Date created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  const renderTicketList = () => {
    if (processedTickets.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <div className="mb-4">
            <Eye className="h-12 w-12 mx-auto opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">No tickets found</h3>
          <p>No tickets match your current filters.</p>
        </div>
      );
    }

    return (
      <div className="bg-white">
        {processedTickets.map((ticket, index) => {
          const overdue = isOverdue(ticket);
          return (
            <div
              key={ticket.id}
              className={`flex items-center px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                selectedTicketIds.has(ticket.id) ? 'bg-blue-50' : ''
              }`}
              onClick={() => onViewTicket(ticket)}
            >
              {/* Checkbox */}
              <div className="w-8 mr-4" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedTicketIds.has(ticket.id)}
                  onChange={() => onToggleSelection?.(ticket.id)}
                  className="rounded border-gray-300"
                />
              </div>

              {/* Contact Column */}
              <div className="w-64 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(ticket.customer.name)}`}>
                  {getInitials(ticket.customer.name)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {ticket.customer.name}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    ({ticket.customer.email.split('@')[1] || 'Customer'})
                  </div>
                </div>
              </div>

              {/* Subject Column */}
              <div className="flex-1 min-w-0 px-4">
                <div className="flex items-center gap-2 mb-1">
                  {overdue && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                      Overdue
                    </span>
                  )}
                  <h3 className="font-medium text-gray-900 truncate">
                    {ticket.title}
                  </h3>
                  <span className="text-gray-400 text-sm shrink-0">
                    #{(ticket as any).ticket_number || `${ticket.id.slice(-6)}`}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  Created: {formatTicketDate(ticket.createdAt)}
                  {overdue && (
                    <span className="text-red-600 ml-2">
                      • Overdue by: {Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24) - 7)} days
                    </span>
                  )}
                </div>
              </div>

              {/* State Column */}
              <div className="w-32 px-4">
                <div className="flex items-center gap-2">
                  {ticket.status === 'open' && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      New
                    </span>
                  )}
                  {ticket.status === 'resolved' && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                      Resolved
                    </span>
                  )}
                  {ticket.status === 'in-progress' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      Customer responded
                    </span>
                  )}
                  {overdue && ticket.status === 'open' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Group Column */}
              <div className="w-24 text-sm text-gray-500 text-center">
                Sup
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-50 flex">
      {/* Left Sidebar - Ticket Views */}
      <div className="w-64 bg-white border-r border-gray-200">
        <TicketViews
          currentView={currentViewFilter}
          onViewChange={setCurrentViewFilter}
          onFiltersChange={handleViewFiltersChange}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top Toolbar */}
        <div className="border-b bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <span className="mr-1">🔍</span>
                New
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-32 bg-white border border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-300 shadow-lg z-50">
                  <SelectItem value="Date created">Date created</SelectItem>
                  <SelectItem value="Last modified">Last modified</SelectItem>
                  <SelectItem value="Priority">Priority</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-sm text-gray-500">Layout:</span>
              <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200">
                Table
              </Button>
              
              <Button variant="outline" size="sm">
                Export
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-blue-50 border-blue-200" : ""}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters ({Object.keys(appliedFilters).filter(key => appliedFilters[key]).length})
              </Button>
              
              <div className="text-sm text-gray-500">
                1 - {Math.min(15, processedTickets.length)} of {processedTickets.length}
              </div>
            </div>
          </div>
        </div>

        {/* Table Header */}
        <div className="border-b bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="w-8">
              <input type="checkbox" className="rounded border-gray-300" />
            </div>
            <div className="w-64 text-sm font-medium text-gray-700">Contact</div>
            <div className="flex-1 text-sm font-medium text-gray-700">Subject</div>
            <div className="w-32 text-sm font-medium text-gray-700">State</div>
            <div className="w-24 text-sm font-medium text-gray-700">Group</div>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {renderTicketList()}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="w-80 border-l bg-white">
          <TicketFiltersPanel
            onFiltersChange={setAppliedFilters}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}
    </div>
  );
}