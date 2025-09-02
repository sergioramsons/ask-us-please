import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Ticket, 
  Inbox, 
  BarChart3, 
  Settings, 
  Users, 
  HelpCircle,
  Home,
  MessageSquare,
  Calendar,
  FileText,
  Phone,
  ChevronDown,
  ChevronRight,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/hooks/useUserRoles";

type View = 'tickets' | 'inbox' | 'contacts-companies' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports' | 'account';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isCollapsed?: boolean;
}

const navigationItems: Array<{
  id: View;
  label: string;
  icon: any;
  description: string;
}> = [
  {
    id: "tickets",
    label: "Tickets",
    icon: Ticket,
    description: "Manage support tickets"
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: Inbox,
    description: "Unified communications"
  },
  {
    id: "contacts-companies",
    label: "Contacts & Companies",
    icon: Users,
    description: "Manage customer relationships"
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    description: "Analytics & insights"
  }
];

const adminItems: Array<{
  id: View;
  label: string;
  icon: any;
  description: string;
}> = [
  {
    id: "admin-panel",
    label: "Admin Panel",
    icon: Settings,
    description: "System configuration"
  }
];

export function FreshdeskSidebar({ currentView, onViewChange, isCollapsed = false }: SidebarProps) {
  const { isAdmin } = useUserRoles();

  const renderNavItem = (item: typeof navigationItems[0]) => (
    <button
      key={item.id}
      onClick={() => onViewChange(item.id)}
      className={cn(
        "modern-nav-item w-full text-left",
        currentView === item.id && "modern-nav-item-active"
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!isCollapsed && (
        <span className="text-sm">{item.label}</span>
      )}
    </button>
  );

  return (
    <div className={cn(
      "modern-sidebar flex flex-col",
      isCollapsed ? "w-[var(--sidebar-width-collapsed)]" : "w-[var(--sidebar-width)]"
    )}>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <HelpCircle className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-sidebar-foreground">Freshdesk</h2>
              <p className="text-xs text-muted-foreground">Support Portal</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-3 space-y-1">
        {navigationItems.map(renderNavItem)}
        
        {isAdmin() && (
          <>
            {!isCollapsed && (
              <div className="pt-4 pb-2 px-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Administration
                </p>
              </div>
            )}
            {adminItems.map(renderNavItem)}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground text-center">
          {isCollapsed ? "v2.0" : "Version 2.0.0"}
        </div>
      </div>
    </div>
  );
}