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

type View = 'tickets' | 'inbox' | 'contacts-companies' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports';

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
    <header className="modern-header px-6 relative">
      <div className="flex items-center justify-between h-full">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hover:bg-accent/80 interactive-scale"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">HD</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground bg-gradient-primary bg-clip-text text-transparent">
                {getPageTitle()}
              </h1>
              <div className="flex items-center gap-2">
                <div className="status-dot status-resolved"></div>
                <span className="text-xs text-muted-foreground">System operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center section - Enhanced Search */}
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <Input
              placeholder="Search tickets, customers, or anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="modern-input pl-12 h-11 group-hover:shadow-md transition-all"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
              ⌘K
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          {currentView === 'tickets' && (
            <Button
              onClick={onCreateTicket}
              variant="premium"
              size="sm"
              className="gap-2 animate-glow"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          )}

          {/* Notifications with badge */}
          <div className="relative">
            <Button variant="glass" size="icon" className="interactive-glow">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse">
              <span className="sr-only">New notifications</span>
            </div>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="glass" className="gap-3 px-4 interactive-scale">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.email}</span>
                  <span className="text-xs text-muted-foreground">Admin Agent</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 glass-effect">
              <DropdownMenuLabel className="text-base font-semibold">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-3 py-3 cursor-pointer hover:bg-accent/80">
                <User className="h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 py-3 cursor-pointer hover:bg-accent/80">
                <Settings className="h-4 w-4" />
                <span>Preferences</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 py-3 cursor-pointer hover:bg-accent/80">
                <HelpCircle className="h-4 w-4" />
                <span>Help & Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="gap-3 py-3 cursor-pointer hover:bg-destructive/10 text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}