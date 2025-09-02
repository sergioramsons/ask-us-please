import { useState } from "react";
import { FreshdeskHeader } from "./FreshdeskHeader";
import { FreshdeskSidebar } from "./FreshdeskSidebar";
import { cn } from "@/lib/utils";

type View = 'tickets' | 'inbox' | 'contacts-companies' | 'create-ticket' | 'ticket-detail' | 'admin-panel' | 'reports' | 'account';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  onCreateTicket?: () => void;
}

export function FreshdeskLayout({ 
  children, 
  currentView, 
  onViewChange, 
  onCreateTicket 
}: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <FreshdeskSidebar
        currentView={currentView}
        onViewChange={onViewChange}
        isCollapsed={sidebarCollapsed}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <FreshdeskHeader
          currentView={currentView}
          onViewChange={onViewChange}
          onToggleSidebar={toggleSidebar}
          onCreateTicket={onCreateTicket}
        />
        
        {/* Content */}
        <main className="modern-content flex-1 p-6">
          <div className={cn(
            "max-w-7xl mx-auto",
            "animate-fade-in"
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}