import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const freshdeskApiKey = Deno.env.get('FRESHDESK_API_KEY');
const freshdeskDomain = Deno.env.get('FRESHDESK_DOMAIN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FreshdeskTicket {
  id: number;
  subject: string;
  description_text: string;
  status: number;
  priority: number;
  requester_id: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  custom_fields: Record<string, any>;
}

interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

function mapFreshdeskStatusToLocal(status: number): string {
  const statusMap: Record<number, string> = {
    2: 'open',
    3: 'in-progress', 
    4: 'resolved',
    5: 'closed'
  };
  return statusMap[status] || 'open';
}

function mapFreshdeskPriorityToLocal(priority: number): string {
  const priorityMap: Record<number, string> = {
    1: 'low',
    2: 'medium',
    3: 'high',
    4: 'urgent'
  };
  return priorityMap[priority] || 'medium';
}

function mapLocalStatusToFreshdesk(status: string): number {
  const statusMap: Record<string, number> = {
    'open': 2,
    'in-progress': 3,
    'resolved': 4,
    'closed': 5
  };
  return statusMap[status] || 2;
}

function mapLocalPriorityToFreshdesk(priority: string): number {
  const priorityMap: Record<string, number> = {
    'low': 1,
    'medium': 2,
    'high': 3,
    'urgent': 4
  };
  return priorityMap[priority] || 2;
}

async function fetchFreshdeskTickets(): Promise<any[]> {
  console.log('Fetching tickets from Freshdesk...');
  
  const response = await fetch(`https://${freshdeskDomain}.freshdesk.com/api/v2/tickets`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(`${freshdeskApiKey}:X`)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Freshdesk API error: ${response.status} ${response.statusText}`);
  }

  const tickets: FreshdeskTicket[] = await response.json();
  console.log(`Fetched ${tickets.length} tickets from Freshdesk`);

  // Get contacts for requester info
  const contactsResponse = await fetch(`https://${freshdeskDomain}.freshdesk.com/api/v2/contacts`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(`${freshdeskApiKey}:X`)}`,
      'Content-Type': 'application/json',
    },
  });

  const contacts: FreshdeskContact[] = contactsResponse.ok ? await contactsResponse.json() : [];
  const contactsMap = contacts.reduce((acc, contact) => {
    acc[contact.id] = contact;
    return acc;
  }, {} as Record<number, FreshdeskContact>);

  // Transform tickets to our format
  return tickets.map(ticket => {
    const contact = contactsMap[ticket.requester_id];
    return {
      id: `fd-${ticket.id}`,
      title: ticket.subject,
      description: ticket.description_text,
      status: mapFreshdeskStatusToLocal(ticket.status),
      priority: mapFreshdeskPriorityToLocal(ticket.priority),
      category: 'support',
      customerName: contact?.name || 'Unknown',
      customerEmail: contact?.email || 'unknown@example.com',
      createdAt: new Date(ticket.created_at),
      updatedAt: new Date(ticket.updated_at),
      tags: ticket.tags || [],
      assignee: null,
      freshdeskId: ticket.id
    };
  });
}

async function createFreshdeskTicket(ticketData: any): Promise<any> {
  console.log('Creating ticket in Freshdesk...', ticketData);

  // First, find or create contact
  let contactId: number;
  
  // Try to find existing contact
  const contactsResponse = await fetch(
    `https://${freshdeskDomain}.freshdesk.com/api/v2/contacts?email=${encodeURIComponent(ticketData.customerEmail)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${freshdeskApiKey}:X`)}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (contactsResponse.ok) {
    const existingContacts = await contactsResponse.json();
    if (existingContacts.length > 0) {
      contactId = existingContacts[0].id;
      console.log('Found existing contact:', contactId);
    } else {
      // Create new contact
      const newContactResponse = await fetch(`https://${freshdeskDomain}.freshdesk.com/api/v2/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${freshdeskApiKey}:X`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: ticketData.customerName,
          email: ticketData.customerEmail,
        }),
      });

      if (!newContactResponse.ok) {
        throw new Error(`Failed to create contact: ${newContactResponse.status}`);
      }

      const newContact = await newContactResponse.json();
      contactId = newContact.id;
      console.log('Created new contact:', contactId);
    }
  } else {
    throw new Error(`Failed to search for contact: ${contactsResponse.status}`);
  }

  // Create the ticket
  const ticketPayload = {
    subject: ticketData.title,
    description: ticketData.description,
    status: mapLocalStatusToFreshdesk(ticketData.status),
    priority: mapLocalPriorityToFreshdesk(ticketData.priority),
    requester_id: contactId,
    tags: ticketData.tags || [],
  };

  const response = await fetch(`https://${freshdeskDomain}.freshdesk.com/api/v2/tickets`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${freshdeskApiKey}:X`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticketPayload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create ticket: ${response.status} ${response.statusText}`);
  }

  const createdTicket = await response.json();
  console.log('Ticket created in Freshdesk:', createdTicket.id);

  return {
    id: `fd-${createdTicket.id}`,
    title: createdTicket.subject,
    description: createdTicket.description_text,
    status: mapFreshdeskStatusToLocal(createdTicket.status),
    priority: mapFreshdeskPriorityToLocal(createdTicket.priority),
    category: 'support',
    customerName: ticketData.customerName,
    customerEmail: ticketData.customerEmail,
    createdAt: new Date(createdTicket.created_at),
    updatedAt: new Date(createdTicket.updated_at),
    tags: createdTicket.tags || [],
    assignee: null,
    freshdeskId: createdTicket.id
  };
}

async function updateFreshdeskTicket(freshdeskId: number, updateData: any): Promise<void> {
  console.log('Updating ticket in Freshdesk:', freshdeskId, updateData);

  const updatePayload: any = {};
  
  if (updateData.status) {
    updatePayload.status = mapLocalStatusToFreshdesk(updateData.status);
  }
  if (updateData.priority) {
    updatePayload.priority = mapLocalPriorityToFreshdesk(updateData.priority);
  }
  if (updateData.subject) {
    updatePayload.subject = updateData.subject;
  }
  if (updateData.description) {
    updatePayload.description = updateData.description;
  }

  const response = await fetch(`https://${freshdeskDomain}.freshdesk.com/api/v2/tickets/${freshdeskId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${btoa(`${freshdeskApiKey}:X`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update ticket: ${response.status} ${response.statusText}`);
  }

  console.log('Ticket updated in Freshdesk');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!freshdeskApiKey || !freshdeskDomain) {
      throw new Error('Missing Freshdesk API key or domain configuration');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'sync':
        const tickets = await fetchFreshdeskTickets();
        return new Response(JSON.stringify({ tickets }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create':
        const { ticketData } = await req.json();
        const newTicket = await createFreshdeskTicket(ticketData);
        return new Response(JSON.stringify({ ticket: newTicket }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'update':
        const { freshdeskId, updateData } = await req.json();
        await updateFreshdeskTicket(freshdeskId, updateData);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in freshdesk-sync function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});