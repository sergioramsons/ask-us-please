import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketPriority, TicketCategory } from "@/types/ticket";
import { useToast } from "@/hooks/use-toast";
import { useContacts } from "@/hooks/useContacts";
import { Contact } from "@/types/contact";

interface TicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  customerName: string;
  customerEmail: string;
}

interface TicketFormProps {
  onSubmit: (ticket: TicketFormData) => void;
  onCancel?: () => void;
  defaultPhone?: string;
  defaultName?: string;
}

export function TicketForm({ onSubmit, onCancel, defaultPhone, defaultName }: TicketFormProps) {
  const { toast } = useToast();
  const { contacts, getContactByEmail } = useContacts();
  const [customerSuggestions, setCustomerSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState<TicketFormData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    customerName: defaultName || '',
    customerEmail: ''
  });

  // Add phone field to show caller info
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone || '');

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, customerEmail: email });
    
    if (email.length > 2) {
      const suggestions = contacts.filter(contact => 
        contact.email.toLowerCase().includes(email.toLowerCase()) ||
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(email.toLowerCase())
      ).slice(0, 5);
      setCustomerSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }

    // Auto-fill name if exact email match found
    const existingContact = getContactByEmail(email);
    if (existingContact) {
      setFormData(prev => ({ 
        ...prev, 
        customerEmail: email,
        customerName: `${existingContact.first_name} ${existingContact.last_name}` 
      }));
    }
  };

  const selectContact = (contact: Contact) => {
    setFormData(prev => ({
      ...prev,
      customerEmail: contact.email,
      customerName: `${contact.first_name} ${contact.last_name}`
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.customerName || !formData.customerEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'general',
      customerName: '',
      customerEmail: ''
    });

    toast({
      title: "Success",
      description: "Ticket created successfully!"
    });
  };

  return (
    <Card className="shadow-medium animate-fade-in">
      <CardHeader>
        <CardTitle>Create New Ticket</CardTitle>
        <CardDescription>
          Fill out the form below to create a new support ticket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>
            
            {defaultPhone && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  readOnly={!!defaultPhone}
                  className={defaultPhone ? "bg-muted" : ""}
                />
              </div>
            )}
            <div className="space-y-2 relative">
              <Label htmlFor="customerEmail">Customer Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => {
                  if (customerSuggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Enter customer email"
                required
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {customerSuggestions.map(contact => (
                    <div
                      key={contact.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => selectContact(contact)}
                    >
                      <div className="font-medium">{contact.first_name} {contact.last_name}</div>
                      <div className="text-sm text-gray-600">{contact.email}</div>
                      {contact.company && <div className="text-xs text-gray-500">{contact.company}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
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

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value: TicketCategory) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="feature-request">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity">
              Create Ticket
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