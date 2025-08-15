import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/helpdesk/dashboard-stats";
import { TicketForm } from "@/components/helpdesk/ticket-form";
import { TicketList } from "@/components/helpdesk/ticket-list";
import { TicketDetail } from "@/components/helpdesk/ticket-detail";
import { Ticket, TicketStats, TicketStatus } from "@/types/ticket";
import { mockTickets } from "@/data/mock-tickets";
import { Plus, Headphones } from "lucide-react";

type View = 'dashboard' | 'create-ticket' | 'ticket-detail';

const Index = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Calculate stats
  const stats: TicketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };

  const handleCreateTicket = (ticketData: any) => {
    const newTicket: Ticket = {
      id: Date.now().toString(),
      title: ticketData.title,
      description: ticketData.description,
      status: 'open',
      priority: ticketData.priority,
      category: ticketData.category,
      customer: {
        name: ticketData.customerName,
        email: ticketData.customerEmail
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTickets(prev => [newTicket, ...prev]);
    setCurrentView('dashboard');
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCurrentView('ticket-detail');
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(ticket =>
      ticket.id === ticketId
        ? { ...ticket, status, updatedAt: new Date() }
        : ticket
    ));
    
    // Update selected ticket if it's the one being changed
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status, updatedAt: new Date() } : null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-white shadow-large">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">HelpDesk Pro</h1>
                <p className="text-blue-100">Support Ticket Management</p>
              </div>
            </div>
            
            {currentView === 'dashboard' && (
              <Button 
                onClick={() => setCurrentView('create-ticket')}
                className="bg-white text-primary hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === 'dashboard' && (
          <div className="space-y-8">
            <DashboardStats stats={stats} />
            <TicketList tickets={tickets} onViewTicket={handleViewTicket} />
          </div>
        )}

        {currentView === 'create-ticket' && (
          <div className="max-w-2xl mx-auto">
            <TicketForm 
              onSubmit={handleCreateTicket}
              onCancel={() => setCurrentView('dashboard')}
            />
          </div>
        )}

        {currentView === 'ticket-detail' && selectedTicket && (
          <TicketDetail
            ticket={selectedTicket}
            onBack={() => setCurrentView('dashboard')}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
