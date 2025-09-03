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
  const [agentsFilter, setAgentsFilter] = useState('Any agent');
  const [groupsFilter, setGroupsFilter] = useState('Any group');
  const [createdFilter, setCreatedFilter] = useState('Any time');
  const [closedAtFilter, setClosedAtFilter] = useState('Any time');
  const [resolvedAtFilter, setResolvedAtFilter] = useState('Any time');
  const [resolutionDueByFilter, setResolutionDueByFilter] = useState('Any time');
  const [firstResponseDueByFilter, setFirstResponseDueByFilter] = useState('Any time');
  const [nextResponseDueByFilter, setNextResponseDueByFilter] = useState('Any time');
  const [skillsFilter, setSkillsFilter] = useState('Any');
  const [statusFilter, setStatusFilter] = useState('All statuses');

  const applyFilters = () => {
    const filters = {
      agents: agentsFilter !== 'Any agent' ? agentsFilter : null,
      groups: groupsFilter !== 'Any group' ? groupsFilter : null,
      created: createdFilter !== 'Any time' ? createdFilter : null,
      closedAt: closedAtFilter !== 'Any time' ? closedAtFilter : null,
      resolvedAt: resolvedAtFilter !== 'Any time' ? resolvedAtFilter : null,
      status: statusFilter !== 'All statuses' ? statusFilter : null,
    };
    onFiltersChange(filters);
  };

  const clearFilters = () => {
    setAgentsFilter('Any agent');
    setGroupsFilter('Any group');
    setCreatedFilter('Any time');
    setClosedAtFilter('Any time');
    setResolvedAtFilter('Any time');
    setResolutionDueByFilter('Any time');
    setFirstResponseDueByFilter('Any time');
    setNextResponseDueByFilter('Any time');
    setSkillsFilter('Any');
    setStatusFilter('All statuses');
    onFiltersChange({});
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Filter Options */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Agents Include */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Agents include</label>
          <Select value={agentsFilter} onValueChange={setAgentsFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any agent">Any agent</SelectItem>
              <SelectItem value="Assigned to me">Assigned to me</SelectItem>
              <SelectItem value="Unassigned">Unassigned</SelectItem>
              <SelectItem value="Support Team">Support Team</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Groups Include */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Groups include</label>
          <Select value={groupsFilter} onValueChange={setGroupsFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any group">Any group</SelectItem>
              <SelectItem value="Technical Support">Technical Support</SelectItem>
              <SelectItem value="Customer Service">Customer Service</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Created */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Created</label>
          <Select value={createdFilter} onValueChange={setCreatedFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any time">Any time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Yesterday">Yesterday</SelectItem>
              <SelectItem value="This week">This week</SelectItem>
              <SelectItem value="Last week">Last week</SelectItem>
              <SelectItem value="This month">This month</SelectItem>
              <SelectItem value="Last month">Last month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Closed at */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Closed at</label>
          <Select value={closedAtFilter} onValueChange={setClosedAtFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any time">Any time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Yesterday">Yesterday</SelectItem>
              <SelectItem value="This week">This week</SelectItem>
              <SelectItem value="Last week">Last week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resolved at */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Resolved at</label>
          <Select value={resolvedAtFilter} onValueChange={setResolvedAtFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any time">Any time</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Yesterday">Yesterday</SelectItem>
              <SelectItem value="This week">This week</SelectItem>
              <SelectItem value="Last week">Last week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resolution due by */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Resolution due by</label>
          <Select value={resolutionDueByFilter} onValueChange={setResolutionDueByFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any time">Any time</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Tomorrow">Tomorrow</SelectItem>
              <SelectItem value="This week">This week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* First response due by */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">First response due by</label>
          <Select value={firstResponseDueByFilter} onValueChange={setFirstResponseDueByFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any time">Any time</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Tomorrow">Tomorrow</SelectItem>
              <SelectItem value="This week">This week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Next response due by */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Next response due by</label>
          <Select value={nextResponseDueByFilter} onValueChange={setNextResponseDueByFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any time">Any time</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Today">Today</SelectItem>
              <SelectItem value="Tomorrow">Tomorrow</SelectItem>
              <SelectItem value="This week">This week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Skills include */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Skills include</label>
          <Select value={skillsFilter} onValueChange={setSkillsFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              <SelectItem value="Technical">Technical</SelectItem>
              <SelectItem value="Customer Service">Customer Service</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Include */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Status include</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All statuses">All statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Apply Button */}
      <div className="p-4 border-t">
        <Button 
          onClick={applyFilters} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}