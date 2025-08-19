import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface POP3Response {
  success: boolean;
  message: string;
  emailCount?: number;
  processedCount?: number;
  errors?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting POP3 email fetch process...');
    
    // Get all active incoming mail servers
    const { data: servers, error: serversError } = await supabase
      .from('incoming_mail_servers')
      .select('*')
      .eq('is_active', true)
      .eq('server_type', 'pop3');

    if (serversError) {
      console.error('Error fetching mail servers:', serversError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch mail servers' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!servers || servers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active POP3 servers configured' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: POP3Response[] = [];

    for (const server of servers) {
      console.log(`Processing server: ${server.name}`);
      const result = await fetchEmailsFromServer(server);
      results.push(result);
      
      // Update last_check timestamp
      await supabase
        .from('incoming_mail_servers')
        .update({ last_check: new Date().toISOString() })
        .eq('id', server.id);
    }

    const totalProcessed = results.reduce((sum, r) => sum + (r.processedCount || 0), 0);
    const hasErrors = results.some(r => !r.success);

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        message: `Processed ${totalProcessed} emails from ${servers.length} server(s)`,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in fetch-pop3-emails:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Failed to fetch emails",
        error: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function fetchEmailsFromServer(server: any): Promise<POP3Response> {
  try {
    console.log(`Connecting to ${server.host}:${server.port} for server: ${server.name}`);
    
    // Decrypt password if encrypted
    let password = server.password;
    if (server.password_encrypted && password && password.startsWith('enc:')) {
      try {
        password = await decryptPassword(password);
        console.log('Password decryption successful');
      } catch (decryptError) {
        console.error('Password decryption failed:', decryptError);
        return {
          success: false,
          message: `Password decryption failed for server ${server.name}: ${decryptError.message}`
        };
      }
    }

    const emails = await connectAndFetchEmails({
      host: server.host,
      port: server.port,
      username: server.username,
      password: password,
      useSSL: server.use_ssl,
      useTLS: server.use_tls
    });

    console.log(`Fetched ${emails.length} emails from ${server.name}`);

    let processedCount = 0;
    const errors: string[] = [];

    for (const email of emails) {
      try {
        // Check if email already exists
        const { data: existingEmail, error: queryError } = await supabase
          .from('incoming_emails')
          .select('id')
          .eq('message_id', email.messageId)
          .maybeSingle();

        if (queryError) {
          console.error('Database query error:', queryError);
          errors.push(`Database error checking email ${email.messageId}: ${queryError.message}`);
          continue;
        }

        if (existingEmail) {
          console.log(`Email ${email.messageId} already exists, skipping`);
          continue;
        }

        // Process email using the same logic as webhook processing
        await processIncomingEmail(email, server);
        processedCount++;
        
      } catch (emailError: any) {
        console.error(`Error processing email ${email.messageId}:`, emailError);
        errors.push(`Email ${email.messageId}: ${emailError.message}`);
      }
    }

    return {
      success: errors.length === 0,
      message: `Processed ${processedCount}/${emails.length} emails`,
      emailCount: emails.length,
      processedCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    console.error(`Error with server ${server.name}:`, error);
    return {
      success: false,
      message: `Failed to connect to ${server.name}: ${error.message}`
    };
  }
}

async function connectAndFetchEmails(config: any) {
  // Simple POP3 implementation using raw TCP/TLS
  const { host, port, username, password, useSSL, useTLS } = config;
  
  try {
    const useTlsTransport = useSSL || useTLS || port === 995;
    let conn: Deno.Conn;
    if (useTlsTransport) {
      conn = await Deno.connectTls({ hostname: host, port });
    } else {
      conn = await Deno.connect({ hostname: host, port });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to read a chunk from the socket
    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(8192);
      const bytesRead = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, bytesRead || 0));
    }

    // Read multi-line response terminated by "\r\n.\r\n"
    async function readMultiline(): Promise<string> {
      let chunks = '';
      while (true) {
        const part = await readResponse();
        if (!part) break;
        chunks += part;
        if (chunks.includes("\r\n.\r\n") || chunks.endsWith("\n.\r\n") || chunks.endsWith("\n.\n")) {
          break;
        }
        // Small delay to allow more data
        await new Promise(r => setTimeout(r, 10));
      }
      return chunks;
    }

    // Helper function to send command and read single-line response
    async function sendCommand(command: string): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    }

    // Helper function to send command without reading
    async function writeCommand(command: string): Promise<void> {
      await conn.write(encoder.encode(command + "\r\n"));
    }

    // POP3 handshake - read server greeting without sending anything
    let response = await readResponse();
    if (!response.startsWith("+OK")) {
      throw new Error(`POP3 connection failed: ${response}`);
    }

    // Login
    response = await sendCommand(`USER ${username}`);
    if (!response.startsWith("+OK")) {
      throw new Error(`POP3 USER command failed: ${response}`);
    }

    response = await sendCommand(`PASS ${password}`);
    if (!response.startsWith("+OK")) {
      throw new Error(`POP3 PASS command failed: ${response}`);
    }

    // Get message count
    response = await sendCommand("STAT");
    const messageCount = parseInt(response.split(" ")[1] || "0");
    console.log(`Found ${messageCount} messages`);

    const emails: any[] = [];

    // Fetch most recent emails first (limit to recent 20 to avoid timeout)
    const limit = Math.min(messageCount, 20);
    for (let idx = messageCount; idx > Math.max(0, messageCount - limit); idx--) {
      try {
        await writeCommand(`RETR ${idx}`);
        const emailResponse = await readMultiline();
        if (emailResponse.startsWith("+OK")) {
          const email = parseEmail(emailResponse);
          if (email) {
            emails.push(email);
          }
        }
      } catch (emailError) {
        console.warn(`Failed to fetch email ${idx}:`, emailError);
      }
    }

    // Close connection
    await sendCommand("QUIT");
    conn.close();

    return emails;

  } catch (error) {
    throw new Error(`POP3 connection error: ${error.message}`);
  }
}

function parseEmail(rawEmail: string) {
  try {
    const lines = rawEmail.split('\n');
    const headers: Record<string, string> = {};
    let bodyStart = 0;

    // Parse headers
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') {
        bodyStart = i + 1;
        break;
      }
      
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).toLowerCase().trim();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    // Parse body
    const body = lines.slice(bodyStart).join('\n').trim();

    // Extract email addresses from headers
    const fromMatch = headers['from']?.match(/<([^>]+)>/) || [null, headers['from']];
    const toMatch = headers['to']?.match(/<([^>]+)>/) || [null, headers['to']];

    return {
      messageId: headers['message-id'] || `pop3-${Date.now()}-${Math.random()}`,
      from: {
        email: fromMatch[1] || headers['from'] || 'unknown@unknown.com',
        name: headers['from']?.replace(/<[^>]+>/, '').trim() || undefined
      },
      to: {
        email: toMatch[1] || headers['to'] || 'unknown@unknown.com',
        name: headers['to']?.replace(/<[^>]+>/, '').trim() || undefined
      },
      subject: headers['subject'] || 'No Subject',
      text: body,
      html: body,
      date: headers['date'] || new Date().toISOString(),
      headers
    };

  } catch (error) {
    console.error('Error parsing email:', error);
    return null;
  }
}

async function processIncomingEmail(emailData: any, server: any) {
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
      organization_id: server.organization_id,
      email_server_id: server.id,
      headers: emailData.headers || {}
    })
    .select()
    .single();

  if (emailError) {
    throw new Error(`Failed to store email: ${emailError.message}`);
  }

  console.log('Email stored successfully:', emailRecord.id);

  // First, try to detect if this email is a reply to an existing ticket
  try {
    const subjectText = emailData.subject || '';
    const match =
      subjectText.match(/\b(TICKET-\d{5,})\b/i) ||
      subjectText.match(/\[(TICKET-\d{5,})\]/i) ||
      subjectText.match(/#(TICKET-\d{5,})/i);

    if (match) {
      const ticketNumber = (match[1] || match[0]).toUpperCase();
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id, contact_id')
        .eq('ticket_number', ticketNumber)
        .maybeSingle();

      if (existingTicket) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('email')
          .eq('id', existingTicket.contact_id)
          .maybeSingle();

        if (!contact || (contact.email || '').toLowerCase() !== (emailData.from.email || '').toLowerCase()) {
          console.log('Reply email not from original contact; will treat as new ticket if configured');
        } else {
          // Add comment to existing ticket
          const { error: commentError } = await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: existingTicket.id,
              content: emailData.text || emailData.html || 'Email content not available',
              email_id: emailRecord.id,
              is_internal: false,
            });

          if (commentError) {
            console.error('Error creating comment for existing ticket:', commentError);
          } else {
            await supabase
              .from('incoming_emails')
              .update({ ticket_id: existingTicket.id, processed: true })
              .eq('id', emailRecord.id);
            console.log('Added comment to existing ticket and marked email processed');
            return; // Done handling this email
          }
        }
      }
    }
  } catch (replyCheckError) {
    console.warn('Error checking for existing ticket reply:', replyCheckError);
  }

  // Auto-create ticket if configured
  if (server.auto_create_tickets) {
    const shouldCreateTicket = await checkAutoTicketCreation(emailData);
    
    if (shouldCreateTicket) {
      const ticket = await createTicketFromEmail(emailRecord, emailData, server);
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
  }
}

async function checkAutoTicketCreation(emailData: any): Promise<boolean> {
  // Create tickets for all emails except auto-replies
  const isAutoReply = emailData.subject.toLowerCase().includes('auto') ||
                     emailData.subject.toLowerCase().includes('automatic') ||
                     emailData.subject.toLowerCase().includes('out of office') ||
                     emailData.subject.toLowerCase().includes('vacation');
  
  return !isAutoReply;
}

async function createTicketFromEmail(emailRecord: any, emailData: any, server: any) {
  try {
    // Generate ticket number for this server's organization
    const { data: ticketNumber } = await supabase.rpc('generate_ticket_number', { org_id: server.organization_id });

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
          name: emailData.from.name || (emailData.from.email?.split('@')[0] || 'Unknown User'),
          organization_id: server.organization_id,
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
        department_id: server.auto_assign_department,
        organization_id: server.organization_id,
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

async function decryptPassword(encryptedPassword: string): Promise<string> {
  const clean = encryptedPassword.startsWith('enc:') ? encryptedPassword.slice(4) : encryptedPassword;
  const combined = new Uint8Array(atob(clean).split('').map(c => c.charCodeAt(0)));
  if (combined.length < 13) throw new Error('Invalid encrypted data format');
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const baseKeys = [Deno.env.get('ENCRYPTION_KEY'), 'helpdesk-dev-encryption-key-2024-secure'].filter(Boolean) as string[];

  // Build strategies list
  const strategies: Array<{ name: string; derive: (base: string) => Promise<CryptoKey> }> = [
    {
      name: 'pbkdf2-600k-dev-salt',
      derive: async (base: string) => {
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(base), { name: 'PBKDF2' }, false, ['deriveKey']);
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: new TextEncoder().encode('helpdesk-dev-salt-2024'), iterations: 600000, hash: 'SHA-256' },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      }
    },
    {
      name: 'pbkdf2-100k-compat-salt',
      derive: async (base: string) => {
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(base), { name: 'PBKDF2' }, false, ['deriveKey']);
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: new TextEncoder().encode('static-salt-for-compatibility'), iterations: 100000, hash: 'SHA-256' },
          material,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      }
    },
    {
      name: 'raw-32-aes-gcm',
      derive: async (base: string) => {
        const keyData = new TextEncoder().encode(base.padEnd(32, '0').substring(0, 32));
        return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
      }
    }
  ];

  for (const base of baseKeys) {
    for (const strat of strategies) {
      try {
        const key = await strat.derive(base);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        console.log(`Password decryption succeeded using strategy: ${strat.name}`);
        return new TextDecoder().decode(decrypted);
      } catch (_) {
        // continue
      }
    }
  }

  throw new Error('Failed to decrypt password');
}

serve(handler);