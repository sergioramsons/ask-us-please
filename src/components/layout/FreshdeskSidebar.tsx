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

type View = 'tickets' | 'inbox' | 'contacts' | 'companies' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports';

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
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description: "Manage customer contacts"
  },
  {
    id: "companies",
    label: "Companies",
    icon: Building2,
    description: "Manage company records"
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
        "modern-nav-item w-full text-left group relative",
        currentView === item.id && "modern-nav-item-active"
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
          currentView === item.id 
            ? "bg-primary/20 text-primary" 
            : "text-muted-foreground group-hover:bg-accent/50 group-hover:text-foreground"
        )}>
          <item.icon className="h-4 w-4 flex-shrink-0" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium text-sm">{item.label}</span>
            <span className="text-xs text-muted-foreground opacity-80">{item.description}</span>
          </div>
        )}
      </div>
      {currentView === item.id && (
        <div className="absolute right-2 w-1 h-8 bg-gradient-primary rounded-full animate-scale-in" />
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
      "modern-sidebar flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Logo/Brand */}
      <div className="p-6 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg animate-float">
            <HelpCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="animate-slide-right">
              <h2 className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                BS-HelpDesk
              </h2>
              <p className="text-sm text-muted-foreground">Advanced Support Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-6 space-y-8">
        {renderSection("Main Workspace", navigationItems, "main")}
        
        {isAdmin() && renderSection("Administration", adminItems, "admin")}
      </div>

      {/* Enhanced Footer */}
      <div className="p-6 border-t border-sidebar-border/50 bg-gradient-surface">
        <div className="space-y-3">
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="status-dot status-resolved"></div>
              <span>All systems operational</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground text-center font-mono">
            {isCollapsed ? "v2.0" : "Version 2.0.0 • Built with ❤️"}
          </div>
        </div>
      </div>
    </div>
  );
}