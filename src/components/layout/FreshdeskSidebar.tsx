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
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/hooks/useUserRoles";

type View = 'tickets' | 'inbox' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports';

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
  const [expandedSections, setExpandedSections] = useState<string[]>(["main"]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderNavItem = (item: typeof navigationItems[0]) => (
    <button
      key={item.id}
      onClick={() => onViewChange(item.id)}
      className={cn(
        "freshdesk-nav-item w-full text-left",
        currentView === item.id && "freshdesk-nav-item-active"
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!isCollapsed && (
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground">{item.description}</span>
        </div>
      )}
    </button>
  );

  const renderSection = (title: string, items: typeof navigationItems, sectionId: string) => {
    const isExpanded = expandedSections.includes(sectionId);
    
    return (
      <div key={sectionId} className="space-y-1">
        {!isCollapsed && (
          <button
            onClick={() => toggleSection(sectionId)}
            className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {title}
          </button>
        )}
        
        {(isCollapsed || isExpanded) && (
          <div className="space-y-1 px-2">
            {items.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "freshdesk-sidebar flex flex-col",
      isCollapsed ? "w-16" : "w-60"
    )}>
      {/* Logo/Brand */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-sm">BS-HelpDesk</h2>
              <p className="text-xs text-muted-foreground">Support Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-6">
        {renderSection("Main", navigationItems, "main")}
        
        {isAdmin() && renderSection("Administration", adminItems, "admin")}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground text-center">
          {isCollapsed ? "v1.0" : "Version 1.0.0"}
        </div>
      </div>
    </div>
  );
}