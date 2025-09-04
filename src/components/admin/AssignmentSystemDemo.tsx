import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAssignmentSystem } from '@/hooks/useAssignmentSystem';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Play, X, Plus } from 'lucide-react';

export function AssignmentSystemDemo() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const { getAvailableSkills } = useAssignmentSystem();
  const { departments } = useDepartments();
  
  const [isCreating, setIsCreating] = useState(false);
  const [testTicket, setTestTicket] = useState({
    subject: 'Test Assignment Ticket',
    description: 'This is a test ticket to demonstrate the assignment system.',
    priority: 'medium',
    category: 'general',
    department_id: '',
    required_skills: [] as string[]
  });
  
  const [newSkill, setNewSkill] = useState('');
  const [lastAssignment, setLastAssignment] = useState<string>('');

  const availableSkills = getAvailableSkills();

  const addSkill = (skill: string) => {
    if (skill && !testTicket.required_skills.includes(skill)) {
      setTestTicket(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, skill]
      }));
    }
    setNewSkill('');
  };

  const removeSkill = (skillToRemove: string) => {
    setTestTicket(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const createTestTicket = async () => {
    if (!organization?.id || !user?.id) {
      toast({
        title: "Error",
        description: "Missing organization or user context",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Generate a unique ticket number
      const { data: existingTickets } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(1);

      let ticketNumber = 'TICKET-00001';
      if (existingTickets && existingTickets.length > 0) {
        const lastNumber = parseInt(existingTickets[0].ticket_number.split('-')[1]) || 0;
        ticketNumber = `TICKET-${String(lastNumber + 1).padStart(5, '0')}`;
      }

      // Create the ticket
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          organization_id: organization.id,
          ticket_number: ticketNumber,
          subject: testTicket.subject,
          description: testTicket.description,
          priority: testTicket.priority,
          category: testTicket.category,
          department_id: testTicket.department_id || null,
          required_skills: testTicket.required_skills.length > 0 ? testTicket.required_skills : null,
          created_by: user.id,
          status: 'open'
        })
        .select()
        .single();

      if (error) throw error;

      // Call the auto-assignment function
      const { data: assignmentResult, error: assignError } = await supabase.rpc(
        'auto_assign_ticket',
        {
          ticket_id_param: ticket.id,
          org_id: organization.id
        }
      );

      if (assignError) {
        console.error('Assignment error:', assignError);
        setLastAssignment('Assignment failed - ticket created but not assigned');
      } else if (assignmentResult) {
        setLastAssignment(`✅ Ticket assigned to: ${assignmentResult}`);
      } else {
        setLastAssignment('⚠️ No available agents found for assignment');
      }

      toast({
        title: "Success",
        description: `Test ticket ${ticketNumber} created and processed`,
      });

      // Reset form
      setTestTicket(prev => ({ ...prev, required_skills: [] }));

    } catch (error: any) {
      console.error('Error creating test ticket:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test ticket",
        variant: "destructive",
      });
      setLastAssignment('❌ Failed to create ticket');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Assignment System Demo</h3>
        <p className="text-sm text-muted-foreground">
          Create test tickets to see how the assignment system works with different settings and skills.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Create Test Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={testTicket.subject}
                onChange={(e) => setTestTicket(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={testTicket.priority} 
                onValueChange={(value) => setTestTicket(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={testTicket.category}
                onChange={(e) => setTestTicket(prev => ({ ...prev, category: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select 
                value={testTicket.department_id} 
                onValueChange={(value) => setTestTicket(prev => ({ ...prev, department_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={testTicket.description}
              onChange={(e) => setTestTicket(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Required Skills */}
          <div>
            <Label>Required Skills (for skill-based routing)</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Select value={newSkill} onValueChange={setNewSkill}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select skill from existing" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSkills
                      .filter(skill => !testTicket.required_skills.includes(skill))
                      .map((skill) => (
                        <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  onClick={() => addSkill(newSkill)}
                  disabled={!newSkill || testTicket.required_skills.includes(newSkill)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Or enter new skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill(newSkill);
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={() => addSkill(newSkill)}
                  disabled={!newSkill || testTicket.required_skills.includes(newSkill)}
                  size="sm"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
              
              {testTicket.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {testTicket.required_skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={createTestTicket} 
            disabled={isCreating || !testTicket.subject.trim()}
            className="w-full"
          >
            {isCreating ? 'Creating & Assigning...' : 'Create Test Ticket & Assign'}
          </Button>

          {lastAssignment && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Last Assignment Result:</Label>
              <p className="text-sm mt-1">{lastAssignment}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>1. Configure Assignment Method:</strong> Go to Settings tab and choose your assignment method</div>
          <div><strong>2. Set Agent Availability:</strong> Use Agent Availability tab to control who gets tickets</div>
          <div><strong>3. Add Agent Skills:</strong> Use Agent Skills tab to assign expertise to agents</div>
          <div><strong>4. Test Assignment:</strong> Create tickets with different skills and watch the assignment results</div>
          <div className="text-muted-foreground mt-4">
            <strong>Note:</strong> Agents must be marked as available and have capacity for tickets to be assigned to them.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}