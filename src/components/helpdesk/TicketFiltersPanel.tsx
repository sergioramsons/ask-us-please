import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { X, Search, Filter } from "lucide-react";

interface TicketFiltersPanelProps {
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function TicketFiltersPanel({ onFiltersChange, onClose }: TicketFiltersPanelProps) {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const applyFilters = () => {
    const filters = {
      status: statusFilter !== 'all' ? statusFilter : null,
      priority: priorityFilter !== 'all' ? priorityFilter : null,
      assignee: assigneeFilter !== 'all' ? assigneeFilter : null,
      source: sourceFilter !== 'all' ? sourceFilter : null,
    };
    onFiltersChange(filters);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setSourceFilter('all');
    onFiltersChange({});
  };

  const activeFiltersCount = [statusFilter, priorityFilter, assigneeFilter, sourceFilter]
    .filter(filter => filter !== 'all').length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h2 className="font-medium">Filters</h2>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search within filters */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search filters..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Priority Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block">Priority</label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Assignee Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block">Assignee</label>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="me">Assigned to me</SelectItem>
              <SelectItem value="support-team">Support Team</SelectItem>
              <SelectItem value="technical-team">Technical Team</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Source Filter */}
        <div>
          <label className="text-sm font-medium mb-3 block">Source</label>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="portal">Portal</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
              <SelectItem value="api">API</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Date Range - Placeholder for future implementation */}
        <div>
          <label className="text-sm font-medium mb-3 block">Created Date</label>
          <div className="text-sm text-muted-foreground">
            Date range filters coming soon
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        <Button onClick={applyFilters} className="w-full">
          Apply Filters
        </Button>
        <Button variant="outline" onClick={clearFilters} className="w-full">
          Clear All
        </Button>
      </div>
    </div>
  );
}