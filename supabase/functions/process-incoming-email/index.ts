import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { parseMultipartEmail } from './_shared/email-parser.ts';

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

    // Determine organization for this email (match POP3 server username or fallback)
    const { data: serverMatch } = await supabase
      .from('incoming_mail_servers')
      .select('organization_id')
      .eq('username', emailData.to.email)
      .eq('is_active', true)
      .maybeSingle();

    let orgId = serverMatch?.organization_id;
    if (!orgId) {
      const { data: defaultOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();
      orgId = defaultOrg?.id;
    }

    // Store the incoming email
    const { data: emailRecord, error: emailError } = await supabase
      .from('incoming_emails')
      .insert({
        message_id: emailData.messageId,
        from_email: emailData.from.email,
        from_name: emailData.from.name,
        to_email: emailData.to.email,
        subject: emailData.subject,
        body_text: emailData.text,
        body_html: emailData.html,
        received_at: emailData.date ? new Date(emailData.date).toISOString() : new Date().toISOString(),
        organization_id: orgId,
        headers: emailData.headers || {}
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

    // Check if this is a response to an existing ticket
    const existingTicket = await findExistingTicket(emailData);
    let autoTicketCreated = false;
    let commentAdded = false;
    
    if (existingTicket) {
      // This is a customer response to an existing ticket
      console.log('Adding comment to existing ticket:', existingTicket.ticket_number);
      
      // Create a comment on the existing ticket
      const { error: commentError } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: existingTicket.id,
          content: emailData.text || emailData.html || 'Email content not available',
          email_id: emailRecord.id,
          is_internal: false,
          contact_id: existingTicket.contact_id,
        });

      if (commentError) {
        console.error('Error creating comment:', commentError);
      } else {
        console.log('Comment added successfully to ticket:', existingTicket.ticket_number);
        commentAdded = true;
        
        // Update email record with ticket reference
        await supabase
          .from('incoming_emails')
          .update({ 
            ticket_id: existingTicket.id,
            processed: true 
          })
          .eq('id', emailRecord.id);
      }
    } else {
      // Check if we should auto-create a new ticket
      const shouldCreateTicket = await checkAutoTicketCreation(emailData);
      
      if (shouldCreateTicket) {
        const ticket = await createTicketFromEmail(emailRecord, emailData);
        if (ticket) {
          console.log('Auto-created ticket:', ticket.ticket_number);
          autoTicketCreated = true;
          
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
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email processed successfully",
        emailId: emailRecord.id,
        autoTicketCreated,
        commentAdded
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
    // Get default organization for now - in a real setup, you'd determine this from the email domain
    const { data: defaultOrg } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();
    
    const orgId = defaultOrg?.id;
    if (!orgId) {
      console.error('No organization found');
      return null;
    }
    
    // Generate ticket number
    const { data: ticketNumber } = await supabase
      .rpc('generate_ticket_number', { org_id: orgId });

    // Check if contact exists
    let contactId = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', emailData.from.email)
      .maybeSingle();

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
          name: emailData.from.name || (emailData.from.email?.split('@')[0] || 'Unknown User'),
          organization_id: orgId,
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

    // Parse email content to get clean text
    const rawContent = emailData.text || emailData.html || '';
    const parsedContent = parseMultipartEmail(rawContent);
    
    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        subject: emailData.subject,
        description: parsedContent.text || 'Email content not available',
        priority: priority,
        status: 'open',
        contact_id: contactId,
        organization_id: orgId,
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
        content: parsedContent.text || 'Email content not available',
        email_id: emailRecord.id,
        is_internal: false,
      });

    return ticket;
  } catch (error) {
    console.error('Error in createTicketFromEmail:', error);
    return null;
  }
}

async function findExistingTicket(emailData: IncomingEmailData) {
  try {
    // Extract ticket number from subject line
    // Common patterns: "Re: TICKET-00001", "[TICKET-00001]", "#TICKET-00001"
    const ticketNumberRegex = /(?:re:\s*)?(?:\[|\#)?(TICKET-\d+)/i;
    const match = emailData.subject.match(ticketNumberRegex);
    
    if (match) {
      const ticketNumber = match[1];
      console.log('Found ticket number in subject:', ticketNumber);
      
      // Look up the ticket by ticket number
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, contact_id, status')
        .eq('ticket_number', ticketNumber)
        .single();
      
      if (error) {
        console.log('No ticket found with number:', ticketNumber);
        return null;
      }
      
      // Verify the email is from the same contact or related
      const { data: contact } = await supabase
        .from('contacts')
        .select('email')
        .eq('id', ticket.contact_id)
        .single();
      
      if (contact && contact.email.toLowerCase() === emailData.from.email.toLowerCase()) {
        console.log('Email from ticket contact, this is a customer response');
        return ticket;
      } else {
        console.log('Email not from original contact, treating as new inquiry');
        return null;
      }
    }
    
    // Alternative: look for tickets from the same contact with similar subject
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('id, ticket_number, contact_id, subject, created_at')
      .eq('contact_id', (await getContactByEmail(emailData.from.email))?.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (recentTickets && recentTickets.length > 0) {
      // Check if subject is similar to any recent ticket
      const cleanSubject = (subject: string) => 
        subject.toLowerCase()
          .replace(/^(re:|fwd?:)\s*/i, '')
          .replace(/\[.*?\]/g, '')
          .trim();
      
      const incomingSubject = cleanSubject(emailData.subject);
      
      for (const ticket of recentTickets) {
        const ticketSubject = cleanSubject(ticket.subject);
        if (incomingSubject === ticketSubject) {
          console.log('Found matching ticket by subject:', ticket.ticket_number);
          return ticket;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding existing ticket:', error);
    return null;
  }
}

async function getContactByEmail(email: string) {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .single();
  
  return contact;
}

serve(handler);