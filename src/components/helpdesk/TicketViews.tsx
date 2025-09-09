import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
  import { 
  Search, 
  Star, 
  Users, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Trash2,
  Archive,
  Inbox,
  Eye
} from "lucide-react";

interface TicketViewsProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onFiltersChange: (filters: any) => void;
}

const defaultViews = [
  { id: 'all-tickets', name: 'All tickets', icon: Inbox, count: 0 },
  { id: 'all-unresolved', name: 'All unresolved tickets', icon: AlertCircle, count: 0 },
  { id: 'all-resolved', name: 'All resolved tickets', icon: CheckCircle, count: 0 },
  { id: 'new-and-my-open', name: 'New and my open tickets', icon: User, count: 0 },
  { id: 'tickets-i-raised', name: 'Tickets I raised', icon: User, count: 0 },
  { id: 'tickets-im-watching', name: 'Tickets I\'m watching', icon: Eye, count: 0 },
  { id: 'my-open-tickets', name: 'My open tickets', icon: User, count: 0 },
  { id: 'unassigned', name: 'Unassigned tickets', icon: Users, count: 0 },
  { id: 'overdue', name: 'Overdue tickets', icon: Clock, count: 0 },
  { id: 'resolved-today', name: 'Resolved today', icon: CheckCircle, count: 0 },
  { id: 'pending', name: 'Pending tickets', icon: AlertCircle, count: 0 },
];

const systemViews = [
  { id: 'archived', name: 'Archive', icon: Archive, count: 0 },
  { id: 'spam', name: 'Spam', icon: XCircle, count: 0 },
  { id: 'trash', name: 'Trash', icon: Trash2, count: 0 },
];

export function TicketViews({ currentView, onViewChange, onFiltersChange }: TicketViewsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [favouriteViews] = useState<string[]>(['my-open-tickets']);

  const handleViewClick = (viewId: string) => {
    onViewChange(viewId);
    
    // Apply corresponding filters based on view
    const filters: any = {};
    
    switch (viewId) {
      case 'all-unresolved':
        filters.status = ['open', 'in-progress'];
        break;
      case 'all-resolved':
        filters.status = 'resolved';
        break;
      case 'new-and-my-open':
        filters.status = ['open', 'in-progress'];
        filters.assignee = 'me';
        break;
      case 'tickets-i-raised':
        filters.createdBy = 'me';
        break;
      case 'tickets-im-watching':
        filters.watching = 'me';
        break;
      case 'my-open-tickets':
        filters.status = 'open';
        filters.assignee = 'me';
        break;
      case 'unassigned':
        filters.assignee = 'unassigned';
        break;
      case 'overdue':
        filters.overdue = true;
        break;
      case 'resolved-today':
        filters.status = 'resolved';
        filters.dateRange = 'today';
        break;
      case 'pending':
        filters.status = 'pending';
        break;
      case 'spam':
        filters.category = 'spam';
        break;
      case 'trash':
        filters.category = 'trash';
        break;
      case 'archived':
        filters.category = 'archived';
        break;
      default:
        // All tickets - no filters
        break;
    }
    
    onFiltersChange(filters);
  };

  const renderViewItem = (view: any, isFavourite: boolean = false) => (
    <Button
      key={view.id}
      variant={currentView === view.id ? 'secondary' : 'ghost'}
      className="w-full justify-between p-2 h-auto mb-1"
      onClick={() => handleViewClick(view.id)}
    >
      <div className="flex items-center gap-2">
        {isFavourite && <Star className="h-3 w-3 fill-current text-amber-500" />}
        <view.icon className="h-4 w-4" />
        <span className="text-sm">{view.name}</span>
      </div>
      {view.count > 0 && (
        <Badge variant="outline" className="text-xs">
          {view.count}
        </Badge>
      )}
    </Button>
  );

  const filteredViews = defaultViews.filter(view =>
    view.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
          <Input
            placeholder="Search views..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Favourites */}
          {favouriteViews.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Favourites
              </h3>
              <div className="space-y-1">
                {defaultViews
                  .filter(view => favouriteViews.includes(view.id))
                  .map(view => renderViewItem(view, true))}
              </div>
              <Separator className="my-3" />
            </div>
          )}

          {/* Default Views */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Default
            </h3>
            <div className="space-y-1">
              {filteredViews.map(view => renderViewItem(view))}
            </div>
            <Separator className="my-3" />
          </div>

          {/* Personal Views - Placeholder */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Personal
            </h3>
            <div className="text-xs text-muted-foreground p-2">
              No personal views yet
            </div>
            <Separator className="my-3" />
          </div>

          {/* Shared Views - Placeholder */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Shared
            </h3>
            <div className="text-xs text-muted-foreground p-2">
              No shared views
            </div>
            <Separator className="my-3" />
          </div>

          {/* System Views */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              System
            </h3>
            <div className="space-y-1">
              {systemViews.map(view => renderViewItem(view))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}