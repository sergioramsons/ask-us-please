import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  RotateCcw, 
  Users, 
  Target,
  Loader2
} from 'lucide-react';

interface AssignmentRule {
  id: string;
  rule_type: 'round_robin' | 'department' | 'least_active' | 'manual';
  department_id?: string;
  department_name?: string;
  is_active: boolean;
  priority_order: number;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

export function AssignmentRulesManager() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [formData, setFormData] = useState<{
    rule_type: 'round_robin' | 'department' | 'least_active' | 'manual';
    department_id: string;
    is_active: boolean;
    priority_order: number;
  }>({
    rule_type: 'round_robin',
    department_id: '',
    is_active: true,
    priority_order: 1
  });

  useEffect(() => {
    loadRules();
    loadDepartments();
  }, []);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_rules')
        .select(`
          *,
          department:departments(name)
        `)
        .order('priority_order');

      if (error) throw error;

      const rulesWithDepartment: AssignmentRule[] = (data || []).map(rule => ({
        id: rule.id,
        rule_type: rule.rule_type as AssignmentRule['rule_type'],
        department_id: rule.department_id || undefined,
        department_name: rule.department?.name,
        is_active: rule.is_active || false,
        priority_order: rule.priority_order || 1,
        created_at: rule.created_at
      }));

      setRules(rulesWithDepartment);
    } catch (error: any) {
      console.error('Error loading assignment rules:', error);
      toast({
        title: "Error loading assignment rules",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error('Error loading departments:', error);
    }
  };

  const handleSaveRule = async () => {
    try {
      const ruleData = {
        ...formData,
        department_id: formData.department_id || null
      };

      if (editingRule) {
        const { error } = await supabase
          .from('assignment_rules')
          .update(ruleData)
          .eq('id', editingRule.id);
        
        if (error) throw error;
        
        toast({
          title: "Rule updated",
          description: "Assignment rule has been updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('assignment_rules')
          .insert([ruleData]);
        
        if (error) throw error;
        
        toast({
          title: "Rule created",
          description: "New assignment rule has been created successfully"
        });
      }

      setDialogOpen(false);
      setEditingRule(null);
      setFormData({
        rule_type: 'round_robin',
        department_id: '',
        is_active: true,
        priority_order: 1
      });
      await loadRules();
    } catch (error: any) {
      console.error('Error saving rule:', error);
      toast({
        title: "Error saving rule",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('assignment_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: "Rule deleted",
        description: "Assignment rule has been deleted successfully"
      });

      await loadRules();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      toast({
        title: "Error deleting rule",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('assignment_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;

      toast({
        title: isActive ? "Rule activated" : "Rule deactivated",
        description: `Assignment rule has been ${isActive ? 'activated' : 'deactivated'}`
      });

      await loadRules();
    } catch (error: any) {
      console.error('Error toggling rule:', error);
      toast({
        title: "Error updating rule",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setFormData({
      rule_type: rule.rule_type,
      department_id: rule.department_id || '',
      is_active: rule.is_active,
      priority_order: rule.priority_order
    });
    setDialogOpen(true);
  };

  const getRuleTypeDisplay = (type: string) => {
    switch (type) {
      case 'round_robin': return 'Round Robin';
      case 'department': return 'Department Based';
      case 'least_active': return 'Least Active';
      case 'manual': return 'Manual Only';
      default: return type;
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Assignment Rules
            </CardTitle>
            <CardDescription>
              Configure automatic ticket assignment rules for your organization
            </CardDescription>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'Edit Assignment Rule' : 'Create Assignment Rule'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select 
                    value={formData.rule_type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, rule_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          Round Robin - Distribute evenly
                        </div>
                      </SelectItem>
                      <SelectItem value="least_active">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Least Active - Assign to agent with fewest tickets
                        </div>
                      </SelectItem>
                      <SelectItem value="department">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Department Based - Assign by department
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        Manual Only - No automatic assignment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.rule_type === 'department' && (
                  <div className="space-y-2">
                    <Label>Target Department</Label>
                    <Select 
                      value={formData.department_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Priority Order</Label>
                  <Input
                    type="number"
                    value={formData.priority_order}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      priority_order: parseInt(e.target.value) || 1 
                    }))}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers have higher priority
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active Rule</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveRule} className="flex-1">
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">No assignment rules configured</h3>
            <p className="text-sm">Create your first assignment rule to enable automatic ticket distribution</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {rule.rule_type === 'round_robin' && <RotateCcw className="h-4 w-4" />}
                    {rule.rule_type === 'least_active' && <Target className="h-4 w-4" />}
                    {rule.rule_type === 'department' && <Users className="h-4 w-4" />}
                    {rule.rule_type === 'manual' && <Settings className="h-4 w-4" />}
                    
                    <div>
                      <div className="font-medium">{getRuleTypeDisplay(rule.rule_type)}</div>
                      <div className="text-sm text-muted-foreground">
                        {rule.department_name && `Department: ${rule.department_name}`}
                        {!rule.department_name && rule.rule_type === 'department' && 'All Departments'}
                        {rule.rule_type !== 'department' && `Priority: ${rule.priority_order}`}
                      </div>
                    </div>
                  </div>
                  
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}