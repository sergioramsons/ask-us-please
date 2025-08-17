// Legacy AdminPanel - redirects to new FreshdeskAdminPanel
import { FreshdeskAdminPanel } from "./FreshdeskAdminPanel";
import { Ticket } from "@/types/ticket";

interface AdminPanelProps {
  tickets: Ticket[];
  onCreateTicket?: (ticketData: any) => void;
}

export function AdminPanel({ tickets, onCreateTicket }: AdminPanelProps) {
  return <FreshdeskAdminPanel tickets={tickets} onCreateTicket={onCreateTicket} />;
}