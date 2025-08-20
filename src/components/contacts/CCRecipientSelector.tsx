import { useState, useEffect, KeyboardEvent } from 'react';
import { Check, ChevronsUpDown, X, Mail } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useContacts } from '@/hooks/useContacts';

interface CCRecipient {
  id: string;
  email: string;
  name: string;
  isContact?: boolean; // true if from contacts, false if just email
}

interface CCRecipientSelectorProps {
  selectedRecipients: CCRecipient[];
  onRecipientsChange: (recipients: CCRecipient[]) => void;
  placeholder?: string;
}

export function CCRecipientSelector({ 
  selectedRecipients, 
  onRecipientsChange, 
  placeholder = "Add CC recipients..."
}: CCRecipientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const { contacts, loadContacts } = useContacts();

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSelectContact = (contact: any) => {
    const displayName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;
    const recipient: CCRecipient = {
      id: contact.id,
      email: contact.email,
      name: displayName,
      isContact: true
    };

    const isAlreadySelected = selectedRecipients.some(r => r.email === contact.email);
    if (!isAlreadySelected) {
      onRecipientsChange([...selectedRecipients, recipient]);
    }
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (!email || !validateEmail(email)) return;

    const isAlreadySelected = selectedRecipients.some(r => r.email === email);
    if (!isAlreadySelected) {
      const recipient: CCRecipient = {
        id: `email_${Date.now()}`,
        email: email,
        name: email,
        isContact: false
      };
      onRecipientsChange([...selectedRecipients, recipient]);
    }
    setEmailInput('');
  };

  const handleEmailKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleRemoveRecipient = (recipientId: string) => {
    onRecipientsChange(selectedRecipients.filter(r => r.id !== recipientId));
  };

  const filteredContacts = contacts.filter(contact => 
    !selectedRecipients.some(r => r.email === contact.email)
  );

  return (
    <div className="w-full space-y-2">
      {/* Email input for direct entry */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter email address..."
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyPress={handleEmailKeyPress}
          className="flex-1"
        />
        <Button 
          type="button"
          variant="outline" 
          onClick={handleAddEmail}
          disabled={!emailInput.trim() || !validateEmail(emailInput.trim())}
        >
          Add
        </Button>
      </div>

      {/* Contact selector dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <Mail className="mr-2 h-4 w-4" />
            Select from contacts
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search contacts..." />
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
              {filteredContacts.map((contact) => {
                const displayName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;
                return (
                  <CommandItem
                    key={contact.id}
                    onSelect={() => {
                      handleSelectContact(contact);
                      setOpen(false);
                    }}
                  >
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

      {/* Selected recipients */}
      {selectedRecipients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedRecipients.map((recipient) => (
            <Badge 
              key={recipient.id} 
              variant={recipient.isContact ? "default" : "secondary"} 
              className="flex items-center gap-1"
            >
              {recipient.isContact && (
                <div className="w-3 h-3 bg-primary-foreground text-primary rounded-full flex items-center justify-center text-xs">
                  <Check className="h-2 w-2" />
                </div>
              )}
              {recipient.name !== recipient.email ? (
                <span>{recipient.name} ({recipient.email})</span>
              ) : (
                <span>{recipient.email}</span>
              )}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveRecipient(recipient.id)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}