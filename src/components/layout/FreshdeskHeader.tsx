import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Plus,
  Menu,
  ChevronDown,
  HelpCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type View = 'tickets' | 'inbox' | 'contacts-companies' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports' | 'account';

interface HeaderProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onToggleSidebar?: () => void;
  onCreateTicket?: () => void;
}

export function FreshdeskHeader({ 
  currentView, 
  onViewChange, 
  onToggleSidebar,
  onCreateTicket 
}: HeaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'tickets': return 'Tickets';
      case 'inbox': return 'Inbox';
      case 'contacts-companies': return 'Contacts & Companies';
      case 'reports': return 'Reports';
      case 'admin-panel': return 'Admin Panel';
      case 'create-ticket': return 'New Ticket';
      case 'ticket-detail': return 'Ticket Details';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="modern-header px-4">
      <div className="flex items-center justify-between h-full">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hover:bg-accent"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">F</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {currentView === 'tickets' && (
            <Button
              onClick={onCreateTicket}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          )}

          <Button variant="ghost" size="icon" className="hover:bg-accent">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-3 hover:bg-accent">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onViewChange('account')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange('account')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}