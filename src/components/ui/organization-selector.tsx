import React from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
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
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

const OrganizationSelector: React.FC = () => {
  const { organization, userOrganizations, switchOrganization, loading } = useOrganization();
  const [open, setOpen] = React.useState(false);

  const handleOrganizationSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      setOpen(false);
      toast.success('Organization switched successfully');
      // Reload page to ensure all data is refreshed with new organization context
      window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Failed to switch organization');
    }
  };

  if (loading || userOrganizations.length === 0) {
    return null;
  }

  // If user only has access to one organization, don't show the selector
  if (userOrganizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm bg-muted rounded-md">
        <Building2 className="w-4 h-4" />
        {organization?.name || userOrganizations[0].name}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-48 justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-4 h-4" />
            <span className="truncate">
              {organization?.name || "Select organization..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandEmpty>No organization found.</CommandEmpty>
          <CommandGroup>
            {userOrganizations.map((org) => (
              <CommandItem
                key={org.id}
                value={org.name}
                onSelect={() => handleOrganizationSwitch(org.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    organization?.id === org.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="truncate">{org.name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default OrganizationSelector;