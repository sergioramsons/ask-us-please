import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncomingEmailData {
  messageId: string;
  from: {
    email: string;
    name?: string;
  };
  to: {
    email: string;
    name?: string;
  };
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content?: string; // base64 encoded
  }>;
  date?: string;
  headers?: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const emailData: IncomingEmailData = await req.json();
    console.log('Processing incoming email:', JSON.stringify({
      messageId: emailData.messageId,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    }, null, 2));

    // Validate required fields
    if (!emailData.messageId || !emailData.from?.email || !emailData.to?.email || !emailData.subject) {
      return new Response(
        JSON.stringify({ error: "Missing required email fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Store the incoming email
    const { data: emailRecord, error: emailError } = await supabase
      .from('incoming_emails')
      .insert({
        message_id: emailData.messageId,
        sender_email: emailData.from.email,
        sender_name: emailData.from.name,
        recipient_email: emailData.to.email,
        subject: emailData.subject,
        body_text: emailData.text,
        body_html: emailData.html,
        received_at: emailData.date ? new Date(emailData.date).toISOString() : new Date().toISOString(),
      })
      .select()
      .single();

    if (emailError) {
      console.error('Error storing email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to store email', details: emailError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Email stored successfully:', emailRecord.id);

    // Store attachments if any
    if (emailData.attachments && emailData.attachments.length > 0) {
      const attachmentInserts = emailData.attachments.map(attachment => ({
        email_id: emailRecord.id,
        filename: attachment.filename,
        content_type: attachment.contentType,
        size_bytes: attachment.size,
        // In a real implementation, you'd store the actual file content to storage
        // and save the file path here instead of inline content
      }));

      const { error: attachmentError } = await supabase
        .from('email_attachments')
        .insert(attachmentInserts);

      if (attachmentError) {
        console.warn('Error storing attachments:', attachmentError);
      } else {
        console.log(`Stored ${emailData.attachments.length} attachments`);
      }
    }

    // Check if we should auto-create a ticket
    const shouldCreateTicket = await checkAutoTicketCreation(emailData);
    
    if (shouldCreateTicket) {
      const ticket = await createTicketFromEmail(emailRecord, emailData);
      if (ticket) {
        console.log('Auto-created ticket:', ticket.ticket_number);
        
        // Update email record with ticket reference
        await supabase
          .from('incoming_emails')
          .update({ 
            ticket_id: ticket.id,
            processed: true 
          })
          .eq('id', emailRecord.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email processed successfully",
        emailId: emailRecord.id,
        autoTicketCreated: shouldCreateTicket
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error processing incoming email:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process email",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function checkAutoTicketCreation(emailData: IncomingEmailData): Promise<boolean> {
  // Simple rules for auto-creating tickets
  // You can customize these rules based on your needs
  
  const supportEmails = [
    'support@', 
    'help@', 
    'tickets@',
    'contact@'
  ];
  
  // Check if email was sent to a support address
  const isSupportEmail = supportEmails.some(prefix => 
    emailData.to.email.toLowerCase().includes(prefix)
  );
  
  // Don't create tickets for auto-replies, out-of-office, etc.
  const isAutoReply = emailData.subject.toLowerCase().includes('auto') ||
                     emailData.subject.toLowerCase().includes('automatic') ||
                     emailData.subject.toLowerCase().includes('out of office') ||
                     emailData.subject.toLowerCase().includes('vacation');
  
  return isSupportEmail && !isAutoReply;
}

async function createTicketFromEmail(emailRecord: any, emailData: IncomingEmailData) {
  try {
    // Generate ticket number
    const { data: ticketNumber } = await supabase
      .rpc('generate_ticket_number');

    // Check if contact exists
    let contactId = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', emailData.from.email)
      .single();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      // Create new contact
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          email: emailData.from.email,
          first_name: emailData.from.name?.split(' ')[0] || 'Unknown',
          last_name: emailData.from.name?.split(' ').slice(1).join(' ') || 'User',
        })
        .select()
        .single();

      if (!contactError && newContact) {
        contactId = newContact.id;
      }
    }

    // Determine priority based on subject keywords
    let priority = 'medium';
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap'];
    const highKeywords = ['important', 'priority', 'help'];
    
    const subjectLower = emailData.subject.toLowerCase();
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
        subject: emailData.subject,
        description: emailData.text || emailData.html || 'Email content not available',
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
        content: emailData.text || emailData.html || 'Email content not available',
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