import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, User } from "lucide-react";
import { TicketPriority, TicketCategory } from "@/types/ticket";
import { useToast } from "@/hooks/use-toast";
import { useContacts } from "@/hooks/useContacts";
import { useDepartments } from "@/hooks/useDepartments";
import { Contact } from "@/types/contact";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContactForm } from "@/components/contacts/ContactForm";
import { CCRecipientSelector } from "@/components/contacts/CCRecipientSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TicketFormData {
  contact: string;
  subject: string;
  type: TicketCategory;
  status: string;
  priority: TicketPriority;
  group: string;
  agent: string;
  description?: string;
}

interface TicketFormProps {
  onSubmit: (ticket: TicketFormData) => void;
  onCancel?: () => void;
}

export function TicketForm({ onSubmit, onCancel }: TicketFormProps) {
  const { toast } = useToast();
  const { contacts, addContact } = useContacts();
  const { departments, fetchDepartments } = useDepartments();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [createAnother, setCreateAnother] = useState(false);
  const [contactDetailsOpen, setContactDetailsOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showCcSelector, setShowCcSelector] = useState(false);
  const [ccRecipients, setCcRecipients] = useState<Array<{ id: string; email: string; name: string; isContact?: boolean }>>([]);
  
  const [formData, setFormData] = useState<TicketFormData>({
    contact: '',
    subject: '',
    type: 'general',
    status: 'open',
    priority: 'low',
    group: '',
    agent: 'Justine Akvueno'
  });

  // Load departments on mount
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contact || !formData.subject) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
    
    if (!createAnother) {
      // Reset form if not creating another
      setFormData({
        contact: '',
        subject: '',
        type: 'general',
        status: 'open',
        priority: 'low',
        group: '',
        agent: 'Justine Akvueno'
      });
      setSelectedContact(null);
      setCcRecipients([]);
    }

    toast({
      title: "Success",
      description: "Ticket created successfully!"
    });
  };

  const handleAddContact = async (contactData: any) => {
    try {
      await addContact(contactData);
      setShowContactForm(false);
      toast({
        title: "Success",
        description: "Contact added successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <h1 className="text-xl font-medium text-foreground">New ticket</h1>
      </div>

      <div className="flex">
        {/* Main Form Area */}
        <div className="flex-1 p-6">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
            {/* Contact Field */}
            <div className="space-y-2">
              <Label htmlFor="contact" className="text-sm font-medium">
                Contact <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.contact} onValueChange={(value) => setFormData({ ...formData, contact: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name} - {contact.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-right">
                <button 
                  type="button" 
                  className="text-sm text-primary hover:underline mr-4"
                  onClick={() => setShowContactForm(true)}
                >
                  Add new contact
                </button>
                <button 
                  type="button" 
                  className="text-sm text-primary hover:underline"
                  onClick={() => setShowCcSelector(!showCcSelector)}
                >
                  Add Cc
                </button>
              </div>
              
              {/* CC Recipients */}
              {showCcSelector && (
                <div className="mt-2">
                  <CCRecipientSelector
                    selectedRecipients={ccRecipients}
                    onRecipientsChange={setCcRecipients}
                    placeholder="Add CC recipients..."
                  />
                </div>
              )}
            </div>

            {/* Subject Field */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter subject"
                className="bg-background"
                required
              />
            </div>

            {/* Type Field */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">Type</Label>
              <Select value={formData.type} onValueChange={(value: TicketCategory) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="feature-request">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Field */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Field */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group Field */}
            <div className="space-y-2">
              <Label htmlFor="group" className="text-sm font-medium">
                Group <span className="text-destructive">*</span>
              </Label>
              <Select value={formData.group} onValueChange={(value) => setFormData({ ...formData, group: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agent Field */}
            <div className="space-y-2">
              <Label htmlFor="agent" className="text-sm font-medium">Agent</Label>
              <Select value={formData.agent} onValueChange={(value) => setFormData({ ...formData, agent: value })}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="Justine Akusung">Justine Akusung</SelectItem>
                  <SelectItem value="John Doe">John Doe</SelectItem>
                  <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description Editor */}
            <div className="space-y-2">
              <div className="border border-border rounded-lg bg-background">
                {/* Editor Toolbar */}
                <div className="border-b border-border p-2 flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="font-bold">B</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="italic">I</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="underline">U</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">AI</span>
                  </Button>
                  <div className="w-px h-4 bg-border mx-1"></div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">≡</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">≣</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">¶</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">🔗</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">📷</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">📊</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">{}</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">✏️</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">😊</span>
                  </Button>
                </div>
                
                {/* Editor Content Area */}
                <div className="p-4 min-h-[200px]">
                  <textarea
                    className="w-full h-full min-h-[180px] bg-transparent border-0 resize-none outline-none text-sm"
                    placeholder="Start typing your message..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                {/* Bottom Toolbar */}
                <div className="border-t border-border p-2 flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">A</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">📎</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">🖼️</span>
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="text-xs">📊</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Reference Number Field */}
            <div className="space-y-2">
              <Label htmlFor="reference" className="text-sm font-medium">Reference Number</Label>
              <Input
                id="reference"
                placeholder="Enter reference number"
                className="bg-background"
              />
            </div>

            {/* Tags Field */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium">Tags</Label>
              <Input
                id="tags"
                placeholder="Add tags"
                className="bg-background"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="createAnother" 
                  checked={createAnother}
                  onCheckedChange={(checked) => setCreateAnother(!!checked)}
                />
                <Label htmlFor="createAnother" className="text-sm">Create another</Label>
              </div>
              
              <div className="flex gap-3">
                {onCancel && (
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  Create
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l bg-muted/20">
          {/* Contact Details Section */}
          <Collapsible open={contactDetailsOpen} onOpenChange={setContactDetailsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">CONTACT DETAILS</span>
              </div>
              {contactDetailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="flex flex-col items-center py-8 text-center">
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-muted">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">Pick a contact</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Their details and recent conversations will appear here
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Timeline Section */}
          <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/30 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">TIMELINE</span>
              </div>
              {timelineOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                No conversations. It's pretty quiet here!
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            onSubmit={handleAddContact}
            onCancel={() => setShowContactForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}