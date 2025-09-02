import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, TicketStatus } from "@/types/ticket";
import { Search, LayoutGrid, List, Inbox, Filter, ChevronDown, Eye, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState<ViewLayout>('card');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any>({});
  const [currentView, setCurrentView] = useState('all-tickets');

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

    switch (layout) {
      case 'table':
        return (
          <TicketTable 
            tickets={processedTickets}
            onViewTicket={onViewTicket}
            onTicketDeleted={onTicketDeleted}
            selectionMode={selectionMode}
            selectedTicketIds={selectedTicketIds}
            onToggleSelection={onToggleSelection}
          />
        );
      case 'inbox':
        return (
          <TicketInbox 
            tickets={processedTickets}
            onViewTicket={onViewTicket}
            onTicketDeleted={onTicketDeleted}
            selectionMode={selectionMode}
            selectedTicketIds={selectedTicketIds}
            onToggleSelection={onToggleSelection}
          />
        );
      default:
        return (
          <div className="space-y-2">
            {processedTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onViewTicket={onViewTicket}
                onTicketDeleted={onTicketDeleted}
                selectionMode={selectionMode}
                isSelected={selectedTicketIds.has(ticket.id)}
                onToggleSelection={onToggleSelection}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div className="h-full bg-background">
      {/* Main Content Area */}
      <div className="flex h-full">
        {/* Ticket Views Sidebar */}
        <div className={`${showViews ? 'w-64' : 'w-12'} transition-all duration-200 border-r bg-card flex flex-col`}>
          <div className="p-3 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowViews(!showViews)}
              className="w-full justify-start"
            >
              <List className="h-4 w-4 mr-2" />
              {showViews && "Views"}
            </Button>
          </div>
          {showViews && (
            <TicketViews
              currentView={currentView}
              onViewChange={setCurrentView}
              onFiltersChange={setAppliedFilters}
            />
          )}
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Ticket List Header */}
          <div className="p-4 border-b bg-card">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Tickets</h1>
              <div className="flex items-center gap-2">
                {/* Layout Switcher */}
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={layout === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLayout('card')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={layout === 'inbox' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLayout('inbox')}
                    className="rounded-none border-x-0"
                  >
                    <Inbox className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={layout === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLayout('table')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Sort Order */}
                <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filters Toggle */}
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Results Count */}
            <div className="mt-3 text-sm text-muted-foreground">
              {processedTickets.length} tickets
            </div>
          </div>

          {/* Ticket List Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              {renderTicketList()}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="w-80 border-l bg-card">
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