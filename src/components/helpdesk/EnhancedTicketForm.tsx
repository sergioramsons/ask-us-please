import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDepartments } from '@/hooks/useDepartments';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { TicketSeverity, TicketSource, TicketCategory, TicketPriority, TicketCustomer } from '@/types/ticket';
import { useToast } from '@/hooks/use-toast';
import { Calendar as CalendarIcon, Plus, X, Paperclip, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface EnhancedTicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  severity: TicketSeverity;
  category: TicketCategory;
  source: TicketSource;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  customerDepartment: string;
  tags: string[];
  dueDate?: Date;
  escalationLevel: number;
  slaBreached: boolean;
  customFields: Record<string, any>;
  department_id?: string;
}

interface EnhancedTicketFormProps {
  onSubmit: (ticketData: EnhancedTicketFormData) => void;
  onCancel?: () => void;
}

export function EnhancedTicketForm({ onSubmit, onCancel }: EnhancedTicketFormProps) {
  const { departments, fetchDepartments } = useDepartments();
  const { toast } = useToast();
  const [formData, setFormData] = useState<EnhancedTicketFormData>({
    title: '',
    description: '',
    priority: 'medium',
    severity: 'minor',
    category: 'general',
    source: 'portal',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    customerDepartment: '',
    tags: [],
    escalationLevel: 0,
    slaBreached: false,
    customFields: {},
    department_id: undefined
  });

  const [newTag, setNewTag] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();

  // Load departments on mount
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.customerName.trim() || !formData.customerEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      dueDate
    };

    onSubmit(submitData);
    
    toast({
      title: "Ticket Created",
      description: "Enhanced ticket has been successfully created",
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const updateField = (field: keyof EnhancedTicketFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateCustomField = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [key]: value
      }
    }));
  };

  const getSeverityColor = (severity: TicketSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'major': return 'bg-orange-500 text-white';
      case 'minor': return 'bg-yellow-500 text-black';
      case 'minimal': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create Enhanced Ticket
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Detailed description of the issue"
                  rows={4}
                  required
                />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Classification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value: TicketPriority) => updateField('priority', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Severity</Label>
                <Select value={formData.severity} onValueChange={(value: TicketSeverity) => updateField('severity', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Badge className={`mt-1 ${getSeverityColor(formData.severity)}`}>
                  {formData.severity.charAt(0).toUpperCase() + formData.severity.slice(1)}
                </Badge>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value: TicketCategory) => updateField('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="feature-request">Feature Request</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="software">Software</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(value: TicketSource) => updateField('source', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select 
                value={formData.department_id || ""} 
                onValueChange={(value) => updateField('department_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">No Department</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  placeholder="Customer full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="customerEmail">Customer Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => updateField('customerEmail', e.target.value)}
                  placeholder="customer@company.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="customerCompany">Company</Label>
                <Input
                  id="customerCompany"
                  value={formData.customerCompany}
                  onChange={(e) => updateField('customerCompany', e.target.value)}
                  placeholder="Company name"
                />
              </div>

              <div>
                <Label htmlFor="customerDepartment">Department</Label>
                <Input
                  id="customerDepartment"
                  value={formData.customerDepartment}
                  onChange={(e) => updateField('customerDepartment', e.target.value)}
                  placeholder="Customer's department"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Additional Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Set due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="slaBreached"
                    checked={formData.slaBreached}
                    onCheckedChange={(checked) => updateField('slaBreached', checked)}
                  />
                  <Label htmlFor="slaBreached" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    SLA Breach Warning
                  </Label>
                </div>
                
                <div>
                  <Label>Escalation Level</Label>
                  <Select value={formData.escalationLevel.toString()} onValueChange={(value) => updateField('escalationLevel', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select escalation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">No Escalation</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Custom Fields</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Environment</Label>
                <Select onValueChange={(value) => updateCustomField('environment', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Browser/Device</Label>
                <Input
                  onChange={(e) => updateCustomField('browser', e.target.value)}
                  placeholder="Chrome 120, iPhone 15, etc."
                />
              </div>

              <div>
                <Label>Operating System</Label>
                <Input
                  onChange={(e) => updateCustomField('os', e.target.value)}
                  placeholder="Windows 11, macOS 14, iOS 17, etc."
                />
              </div>

              <div>
                <Label>Product Version</Label>
                <Input
                  onChange={(e) => updateCustomField('version', e.target.value)}
                  placeholder="v2.1.0"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6">
            <Button type="submit" className="flex-1">
              Create Enhanced Ticket
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}