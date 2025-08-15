import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing pending emails...');
    
    // Get all unprocessed emails
    const { data: pendingEmails, error: emailsError } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('processed', false)
      .is('ticket_id', null);

    if (emailsError) {
      console.error('Error fetching pending emails:', emailsError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch pending emails' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending emails to process' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

let createdTickets = 0;
let markedProcessed = 0;
const errors: string[] = [];

for (const email of pendingEmails) {
  try {
    // Check if this is an auto-reply
    const subject = (email.subject || '').toLowerCase();
    const isAutoReply = subject.includes('auto') ||
                        subject.includes('automatic') ||
                        subject.includes('out of office') ||
                        subject.includes('vacation');

    if (!isAutoReply) {
      const ticket = await createTicketFromEmail(email);
      if (ticket) {
        console.log('Created ticket:', ticket.ticket_number, 'for email:', email.id);
        // Update email record with ticket reference
        const { error: updateErr } = await supabase
          .from('incoming_emails')
          .update({ 
            ticket_id: ticket.id,
            processed: true 
          })
          .eq('id', email.id);
        if (updateErr) throw updateErr;
        createdTickets++;
        markedProcessed++;
      } else {
        // Ticket creation failed silently; still mark as processed to avoid re-processing loop
        const { error: markErr } = await supabase
          .from('incoming_emails')
          .update({ processed: true })
          .eq('id', email.id);
        if (markErr) throw markErr;
        markedProcessed++;
        errors.push(`Email ${email.id}: Ticket creation returned no result`);
      }
    } else {
      // Mark auto-reply emails as processed without creating tickets
      const { error: markErr } = await supabase
        .from('incoming_emails')
        .update({ processed: true })
        .eq('id', email.id);
      if (markErr) throw markErr;
      markedProcessed++;
    }
    
  } catch (emailError: any) {
    console.error(`Error processing email ${email.id}:`, emailError);
    errors.push(`Email ${email.id}: ${emailError.message || emailError}`);
  }
}

return new Response(
  JSON.stringify({
    success: errors.length === 0,
    message: `Processed ${markedProcessed} pending emails, created ${createdTickets} tickets`,
    createdTickets,
    markedProcessed,
    totalEmails: pendingEmails.length,
    errors: errors.length > 0 ? errors : undefined
  }),
  { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
);

  } catch (error: any) {
    console.error("Error in process-pending-emails:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Failed to process pending emails",
        error: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function createTicketFromEmail(emailRecord: any) {
  try {
    // Generate ticket number
    const { data: ticketNumber } = await supabase.rpc('generate_ticket_number');

    // Check if contact exists
    let contactId = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', emailRecord.sender_email)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          email: emailRecord.sender_email,
          first_name: emailRecord.sender_name?.split(' ')[0] || 'Unknown',
          last_name: emailRecord.sender_name?.split(' ').slice(1).join(' ') || 'User',
        })
        .select()
        .single();

      if (!contactError && newContact) {
        contactId = newContact.id;
      }
    }

    // Determine priority
    let priority = 'medium';
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap'];
    const highKeywords = ['important', 'priority', 'help'];
    
    const subjectLower = emailRecord.subject.toLowerCase();
    if (urgentKeywords.some(keyword => subjectLower.includes(keyword))) {
      priority = 'urgent';
    } else if (highKeywords.some(keyword => subjectLower.includes(keyword))) {
      priority = 'high';
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        subject: emailRecord.subject,
        description: emailRecord.body_text || emailRecord.body_html || 'Email content not available',
        priority: priority,
        status: 'open',
        contact_id: contactId,
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      return null;
    }

    // Create initial comment from the email
    await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticket.id,
        content: emailRecord.body_text || emailRecord.body_html || 'Email content not available',
        email_id: emailRecord.id,
        is_internal: false,
      });

    return ticket;
  } catch (error) {
    console.error('Error in createTicketFromEmail:', error);
    return null;
  }
}

serve(handler);