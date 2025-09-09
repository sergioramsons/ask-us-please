import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDepartments } from '@/hooks/useDepartments';
import { useGroups } from '@/hooks/useGroups';
import { 
  UserCheck, 
  UserX, 
  ArrowRightLeft, 
  Clock, 
  User,
  Shield,
  Loader2,
  RefreshCw,
  Building2,
  Users
} from 'lucide-react';

interface Agent {
  id: string;
  display_name: string | null;
  email: string;
  department_name?: string;
  current_tickets: number;
  max_tickets: number;
  is_available: boolean;
}

interface TicketAssignmentManagerProps {
  ticketId: string;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  onAssignmentChange?: (newAssigneeId: string | null, newAssigneeName: string) => void;
}

export function TicketAssignmentManager({
  ticketId,
  currentAssigneeId,
  currentAssigneeName,
  onAssignmentChange
}: TicketAssignmentManagerProps) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const { departments, fetchDepartments } = useDepartments();
  const { groups } = useGroups();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const resetTransferForm = () => {
    setSelectedAgent('');
    setSelectedDepartment('');
    setSelectedGroup('');
    setTransferReason('');
  };

  useEffect(() => {
    loadAgents();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (organization?.id) {
      loadAgents();
    }
  }, [organization?.id]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      
      if (!organization?.id) {
        setAgents([]);
        return;
      }
      
      // Get all users with agent/admin roles for this organization
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('organization_id', organization.id)
        .in('role', ['Administrator', 'Account Administrator', 'Full Agent', 'Occasional Agent', 'Team Lead', 'admin', 'moderator', 'agent']);

      if (rolesError) throw rolesError;

      const agentUserIds = userRoles?.map(ur => ur.user_id) || [];
      
      if (agentUserIds.length === 0) {
        setAgents([]);
        return;
      }

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          email,
          department_id,
          departments(name)
        `)
        .in('user_id', agentUserIds)
        .eq('organization_id', organization.id);

      if (profilesError) throw profilesError;

      // Get agent availability data
      const { data: availability, error: availabilityError } = await supabase
        .from('agent_availability')
        .select('user_id, is_available, max_tickets')
        .eq('organization_id', organization.id)
        .in('user_id', agentUserIds);

      if (availabilityError) {
        console.warn('Could not load agent availability:', availabilityError);
      }

      // Get current ticket counts for each agent
      const { data: ticketCounts, error: ticketCountError } = await supabase
        .from('tickets')
        .select('assigned_to')
        .eq('organization_id', organization.id)
        .in('status', ['open', 'in-progress', 'pending'])
        .in('assigned_to', agentUserIds);

      if (ticketCountError) {
        console.warn('Could not load ticket counts:', ticketCountError);
      }

      // Create availability and ticket count maps
      const availabilityMap = new Map();
      availability?.forEach(av => {
        availabilityMap.set(av.user_id, av);
      });

      const ticketCountMap = new Map();
      ticketCounts?.forEach(ticket => {
        if (ticket.assigned_to) {
          const count = ticketCountMap.get(ticket.assigned_to) || 0;
          ticketCountMap.set(ticket.assigned_to, count + 1);
        }
      });

      // Transform data into Agent interface
      const agentsList: Agent[] = (profiles || []).map(profile => {
        const userAvailability = availabilityMap.get(profile.user_id) || {
          max_tickets: 10,
          is_available: true
        };

        return {
          id: profile.user_id,
          display_name: profile.display_name,
          email: profile.email || '',
          department_name: (profile as any).departments?.name,
          current_tickets: ticketCountMap.get(profile.user_id) || 0,
          max_tickets: userAvailability.max_tickets,
          is_available: userAvailability.is_available
        };
      });

      setAgents(agentsList);
    } catch (error: any) {
      console.error('Error loading agents:', error);
      toast({
        title: "Error loading agents",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setProcessing(true);
      const orgId = organization?.id;
      if (!orgId) {
        toast({
          title: 'Auto-assignment unavailable',
          description: 'No organization detected. Please select an organization.',
          variant: 'destructive',
        });
        return;
      }

      const { data: assignedAgentName, error: rpcError } = await supabase.rpc('auto_assign_ticket', {
        ticket_id_param: ticketId,
        org_id: orgId,
      });

      if (rpcError) {
        throw rpcError;
      }

      if (!assignedAgentName) {
        toast({
          title: 'Auto-assignment not configured',
          description: 'Add agents with roles and ensure profiles belong to this organization.',
        });
        return;
      }

      const { data: updatedTicket, error: ticketErr } = await supabase
        .from('tickets')
        .select('assigned_to')
        .eq('id', ticketId)
        .maybeSingle();

      if (ticketErr) {
        console.warn('Could not fetch updated ticket:', ticketErr);
      }

      const newAssigneeId = (updatedTicket as any)?.assigned_to || null;
      onAssignmentChange?.(newAssigneeId, assignedAgentName as string);

      toast({
        title: 'Ticket auto-assigned',
        description: `Assigned to ${assignedAgentName}`,
      });

      await loadAgents();
    } catch (error: any) {
      console.error('Error auto-assigning ticket:', error);
      toast({
        title: 'Error auto-assigning ticket',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleTakeOwnership = async () => {
    if (!user) return;
    
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: user.id, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Ownership taken",
        description: "You are now assigned to this ticket"
      });
      
      onAssignmentChange?.(user.id, user.user_metadata?.display_name || 'You');
      await loadAgents(); // Refresh agent list
    } catch (error: any) {
      console.error('Error taking ownership:', error);
      toast({
        title: "Error taking ownership",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferTicket = async () => {
    if (!selectedAgent) return;
    
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to: selectedAgent, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      const transferredToAgent = agents.find(a => a.id === selectedAgent);
      
      toast({
        title: "Ticket transferred",
        description: `Ticket transferred to ${transferredToAgent?.display_name || 'agent'}`
      });
      
      onAssignmentChange?.(selectedAgent, transferredToAgent?.display_name || 'Agent');
      setTransferDialogOpen(false);
      setSelectedAgent('');
      setTransferReason('');
      await loadAgents(); // Refresh agent list
    } catch (error: any) {
      console.error('Error transferring ticket:', error);
      toast({
        title: "Error transferring ticket",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferToDepartment = async () => {
    if (!selectedDepartment) return;
    
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('tickets')
        .update({ 
          department_id: selectedDepartment, 
          assigned_to: null, // Unassign from current agent
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId);

      if (error) throw error;

      const department = departments.find(d => d.id === selectedDepartment);
      
      toast({
        title: "Ticket transferred to department",
        description: `Ticket transferred to ${department?.name || 'department'}`
      });
      
      onAssignmentChange?.(null, `Department: ${department?.name || 'Unknown'}`);
      setTransferDialogOpen(false);
      setSelectedDepartment('');
      setTransferReason('');
    } catch (error: any) {
      console.error('Error transferring ticket to department:', error);
      toast({
        title: "Error transferring ticket",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleTransferToGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      setProcessing(true);
      
      // For group transfer, we'll add a comment about the transfer
      // and unassign the current user
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          assigned_to: null, // Unassign from current agent
          updated_at: new Date().toISOString() 
        })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      const group = groups.find(g => g.id === selectedGroup);
      
      // Add a comment about the group transfer
      const { error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          user_id: user?.id,
          content: `Ticket transferred to group: ${group?.name}${transferReason ? `\n\nReason: ${transferReason}` : ''}`,
          is_internal: true
        });

      if (commentError) {
        console.warn('Could not add transfer comment:', commentError);
      }
      
      toast({
        title: "Ticket transferred to group",
        description: `Ticket transferred to ${group?.name || 'group'}`
      });
      
      onAssignmentChange?.(null, `Group: ${group?.name || 'Unknown'}`);
      setTransferDialogOpen(false);
      setSelectedGroup('');
      setTransferReason('');
    } catch (error: any) {
      console.error('Error transferring ticket to group:', error);
      toast({
        title: "Error transferring ticket",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnassign = async () => {
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('tickets')
        .update({
          assigned_to: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      // No agent availability table in current schema; skipping availability update

      toast({
        title: "Ticket unassigned",
        description: "Ticket is now unassigned"
      });
      
      onAssignmentChange?.(null, 'Unassigned');
      await loadAgents(); // Refresh agent list
    } catch (error: any) {
      console.error('Error unassigning ticket:', error);
      toast({
        title: "Error unassigning ticket",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Assignment Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Assignment */}
        <div className="space-y-2">
          <Label>Current Assignment</Label>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {currentAssigneeId ? (
                <>
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{currentAssigneeName}</span>
                  <Badge variant="outline">Assigned</Badge>
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 text-gray-400" />
                  <span className="text-muted-foreground">Unassigned</span>
                </>
              )}
            </div>
            
            {currentAssigneeId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnassign}
                disabled={processing}
              >
                Unassign
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-2">
          {!currentAssigneeId && (
            <>
              <Button
                onClick={handleAutoAssign}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Auto Assign
              </Button>
              
              <Button
                variant="outline"
                onClick={handleTakeOwnership}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                Take Ownership
              </Button>
            </>
          )}
          
          {(currentAssigneeId || !currentAssigneeId) && (
            <Dialog open={transferDialogOpen} onOpenChange={(open) => {
              setTransferDialogOpen(open);
              if (!open) resetTransferForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Transfer Ticket</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="agent" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="agent" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      Agent
                    </TabsTrigger>
                    <TabsTrigger value="department" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      Department
                    </TabsTrigger>
                    <TabsTrigger value="group" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      Group
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="agent" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Agent</Label>
                      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents
                            .filter(agent => agent.id !== currentAssigneeId)
                            .map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <span>{agent.display_name || 'Unnamed Agent'}</span>
                                  {agent.department_name && (
                                    <Badge variant="outline" className="text-xs">
                                      {agent.department_name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {agent.current_tickets}/{agent.max_tickets}
                                  {!agent.is_available && (
                                    <Badge variant="destructive" className="text-xs ml-1">
                                      Unavailable
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Transfer Reason (Optional)</Label>
                      <Textarea
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        placeholder="Enter reason for transfer..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleTransferTicket}
                        disabled={!selectedAgent || processing}
                        className="flex-1"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                        )}
                        Transfer to Agent
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTransferDialogOpen(false);
                          setSelectedAgent('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="department" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Department</Label>
                      <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(department => (
                            <SelectItem key={department.id} value={department.id}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                <span>{department.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Transfer Reason (Optional)</Label>
                      <Textarea
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        placeholder="Enter reason for transfer..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleTransferToDepartment}
                        disabled={!selectedDepartment || processing}
                        className="flex-1"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Building2 className="h-4 w-4 mr-2" />
                        )}
                        Transfer to Department
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTransferDialogOpen(false);
                          setSelectedDepartment('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="group" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Group</Label>
                      <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                <span>{group.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Transfer Reason (Optional)</Label>
                      <Textarea
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        placeholder="Enter reason for transfer..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleTransferToGroup}
                        disabled={!selectedGroup || processing}
                        className="flex-1"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Users className="h-4 w-4 mr-2" />
                        )}
                        Transfer to Group
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setTransferDialogOpen(false);
                          setSelectedGroup('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Agent Availability Summary */}
        <div className="space-y-2">
          <Label>Available Agents</Label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {agents
              .filter(agent => agent.is_available && agent.current_tickets < agent.max_tickets)
              .slice(0, 5)
              .map(agent => (
              <div key={agent.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <span>{agent.display_name || 'Unnamed Agent'}</span>
                  {agent.department_name && (
                    <Badge variant="outline" className="text-xs">
                      {agent.department_name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {agent.current_tickets}/{agent.max_tickets}
                </div>
              </div>
            ))}
            
            {agents.filter(agent => agent.is_available && agent.current_tickets < agent.max_tickets).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2">
                No available agents
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}