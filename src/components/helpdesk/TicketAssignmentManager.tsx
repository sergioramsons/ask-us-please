import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserCheck, 
  UserX, 
  ArrowRightLeft, 
  Clock, 
  User,
  Shield,
  Loader2,
  RefreshCw
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
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      
      // Get all users with agent roles (admin or moderator)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'moderator']);

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
          department:departments(name)
        `)
        .in('user_id', agentUserIds);

      if (profilesError) throw profilesError;

      // Get agent availability data separately (not available in current schema)
      const availability: any[] = [];

      // Create availability map
      const availabilityMap = new Map();
      availability?.forEach(av => {
        availabilityMap.set(av.user_id, av);
      });

      // Transform data into Agent interface
      const agentsList: Agent[] = (profiles || []).map(profile => {
        const userAvailability = availabilityMap.get(profile.user_id) || {
          current_tickets: 0,
          max_tickets: 10,
          is_available: true
        };

        return {
          id: profile.user_id,
          display_name: profile.display_name,
          email: '', // Will be populated if needed
          department_name: profile.department?.name,
          current_tickets: userAvailability.current_tickets,
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
      toast({
        title: 'Auto-assign not available',
        description: 'Auto-assignment function is not configured.',
      });
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
          
          {currentAssigneeId && (
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Ticket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                      Transfer
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTransferDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
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