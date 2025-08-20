import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useContacts } from '@/hooks/useContacts';
import { ContactForm } from './ContactForm';

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface ContactSelectorProps {
  selectedContacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
  placeholder?: string;
  multiple?: boolean;
}

export function ContactSelector({ 
  selectedContacts, 
  onContactsChange, 
  placeholder = "Select contacts...",
  multiple = true 
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const { contacts, loadContacts, addContact } = useContacts();

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSelectContact = (contact: Contact) => {
    if (multiple) {
      const isSelected = selectedContacts.some(c => c.id === contact.id);
      if (isSelected) {
        onContactsChange(selectedContacts.filter(c => c.id !== contact.id));
      } else {
        onContactsChange([...selectedContacts, contact]);
      }
    } else {
      onContactsChange([contact]);
      setOpen(false);
    }
  };

  const handleRemoveContact = (contactId: string) => {
    onContactsChange(selectedContacts.filter(c => c.id !== contactId));
  };

  const handleAddContact = async (contactData: any) => {
    try {
      const newContact = await addContact(contactData);
      if (newContact) {
        onContactsChange([...selectedContacts, {
          id: newContact.id,
          name: newContact.name,
          email: newContact.email
        }]);
      }
      setShowAddForm(false);
      loadContacts(); // Refresh the contacts list
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedContacts.length > 0
              ? `${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search contacts..." />
            <CommandEmpty>
              <div className="text-center p-4">
                <p className="text-sm text-muted-foreground mb-2">No contacts found.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Contact
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => setShowAddForm(true)}
                className="font-medium text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Contact
              </CommandItem>
              {contacts.map((contact) => {
                const displayName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;
                return (
                  <CommandItem
                    key={contact.id}
                    onSelect={() => handleSelectContact({
                      id: contact.id,
                      name: displayName,
                      email: contact.email
                    })}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedContacts.some(c => c.id === contact.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{displayName}</div>
                      <div className="text-sm text-muted-foreground">{contact.email}</div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected contacts */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedContacts.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="flex items-center gap-1">
              {contact.name} ({contact.email})
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveContact(contact.id)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Add contact form */}
      {showAddForm && (
        <ContactForm
          onSubmit={handleAddContact}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}