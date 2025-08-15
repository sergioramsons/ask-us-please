import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomEmailRequest {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  agentName: string;
  ticketStatus: string;
  priority: string;
  isResolution?: boolean;
  emailServerId?: string;
}

// Password decryption function (mirrors the frontend encryption)
async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    const ALGORITHM = 'AES-GCM';
    const KEY_LENGTH = 256;

    // Get or generate encryption key (same as frontend)
    const keyMaterial = new TextEncoder().encode('helpdesk-email-encryption-key-2024');
    
    // Import the key material
    const importedKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('helpdesk-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      {
        name: ALGORITHM,
        length: KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(encryptedPassword)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing custom email request");
    
    const {
      ticketId,
      customerName,
      customerEmail,
      subject,
      message,
      agentName,
      ticketStatus,
      priority,
      isResolution = false,
      emailServerId
    }: CustomEmailRequest = await req.json();

    console.log("Email request data:", { ticketId, customerEmail, subject, emailServerId });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Use service role for backend operations
    );

    // Get email server configuration
    let emailServer = null;
    if (emailServerId) {
      const { data, error } = await supabase
        .from('email_servers')
        .select('*')
        .eq('id', emailServerId)
        .eq('is_active', true)
        .single();
      
      if (error) {
        console.error("Error fetching email server:", error);
        throw new Error("Email server configuration not found");
      }
      emailServer = data;
    } else {
      // Get default active email server
      const { data, error } = await supabase
        .from('email_servers')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (error) {
        console.error("No active email server found:", error);
        throw new Error("No active email server configured");
      }
      emailServer = data;
    }

    if (!emailServer) {
      throw new Error("No email server configuration available");
    }

    console.log("Using email server:", emailServer.name);

    // Decrypt the password if it's encrypted
    let smtpPassword = emailServer.smtp_password;
    if (emailServer.password_encrypted) {
      try {
        smtpPassword = await decryptPassword(emailServer.smtp_password);
        console.log("Password decrypted successfully");
      } catch (error) {
        console.error("Failed to decrypt password:", error);
        throw new Error("Failed to decrypt email server password");
      }
    } else {
      console.warn("WARNING: Email server password is not encrypted!");
    }

    // Generate email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ticket Update - #${ticketId}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .ticket-info { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .status-open { background-color: #dbeafe; color: #1d4ed8; }
            .status-in-progress { background-color: #fef3c7; color: #d97706; }
            .status-resolved { background-color: #dcfce7; color: #16a34a; }
            .status-closed { background-color: #f3f4f6; color: #6b7280; }
            .priority-high { color: #dc2626; font-weight: bold; }
            .priority-urgent { color: #991b1b; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .message-content { background-color: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isResolution ? '✅ Ticket Resolved' : '📩 Ticket Update'}</h1>
              <p>Support Ticket #${ticketId}</p>
            </div>
            
            <div class="content">
              <p>Hello ${customerName},</p>
              
              ${isResolution ? 
                '<p><strong>Great news!</strong> Your support ticket has been resolved.</p>' : 
                '<p>We have an update on your support ticket.</p>'
              }
              
              <div class="ticket-info">
                <h3>Ticket Details</h3>
                <p><strong>Ticket ID:</strong> #${ticketId}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${ticketStatus.replace(' ', '-')}">${ticketStatus.toUpperCase()}</span></p>
                <p><strong>Priority:</strong> <span class="${priority === 'high' || priority === 'urgent' ? `priority-${priority}` : ''}">${priority.toUpperCase()}</span></p>
                <p><strong>Agent:</strong> ${agentName}</p>
              </div>
              
              <div class="message-content">
                <h4>Message from ${agentName}:</h4>
                <div style="white-space: pre-wrap;">${message}</div>
              </div>
              
              ${isResolution ? 
                '<p>If you have any questions about this resolution or experience any further issues, please don\'t hesitate to create a new support ticket.</p>' :
                '<p>If you have any questions or need to add more information, please reply to this email or log into your support portal.</p>'
              }
              
              <p>Thank you for choosing our service!</p>
              <p>Best regards,<br>${emailServer.sender_name}</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from our support system.</p>
              <p>Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Initialize SMTP client with decrypted password
    const client = new SMTPClient({
      connection: {
        hostname: emailServer.smtp_host,
        port: emailServer.smtp_port,
        tls: emailServer.use_tls,
        auth: {
          username: emailServer.smtp_username,
          password: smtpPassword, // Use decrypted password
        },
      },
    });

    // Send email using SMTP
    await client.send({
      from: `${emailServer.sender_name} <${emailServer.sender_email}>`,
      to: customerEmail,
      replyTo: emailServer.reply_to || emailServer.sender_email,
      subject: `[Ticket #${ticketId}] ${isResolution ? 'Resolved: ' : ''}${subject}`,
      content: emailHtml,
      html: emailHtml,
    });

    await client.close();

    console.log("Custom SMTP email sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully via encrypted custom SMTP server",
        server: emailServer.name,
        encrypted: emailServer.password_encrypted
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-custom-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: "Failed to send email via custom SMTP server. Please check your email server configuration and encryption." 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);