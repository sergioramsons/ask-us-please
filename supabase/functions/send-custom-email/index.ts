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

// Email configuration interface
interface EmailServerConfig {
  sender_name: string;
  sender_email: string;
  reply_to?: string;
}

// Encryption/decryption helpers (fallback to dev key if needed)
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const DEV_KEY_MATERIAL = 'helpdesk-dev-encryption-key-2024-secure';
const DEV_SALT = 'helpdesk-dev-salt-2024';
const ITERATIONS = 600000;

async function deriveKey(material: string): Promise<CryptoKey> {
  const keyMaterial = new TextEncoder().encode(material);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(DEV_SALT),
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    importedKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptPasswordFlexible(encryptedPassword: string): Promise<string> {
  const clean = encryptedPassword.startsWith('enc:') ? encryptedPassword.slice(4) : encryptedPassword;
  const candidates: string[] = [];
  const envKey = Deno.env.get('ENCRYPTION_KEY');
  if (envKey) candidates.push(envKey);
  // Always try the DEV key as fallback (matches frontend)
  candidates.push(DEV_KEY_MATERIAL);

  const combined = new Uint8Array(atob(clean).split('').map((c) => c.charCodeAt(0)));
  if (combined.length < 13) throw new Error('Invalid encrypted data format');
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  for (const material of candidates) {
    try {
      const key = await deriveKey(material);
      const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
      return new TextDecoder().decode(decrypted);
    } catch (_) {
      // try next material
    }
  }
  throw new Error('Failed to decrypt password with available keys');
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

    // Fetch active SMTP server configuration
    let emailServer: any = null;
    if (emailServerId) {
      const { data, error } = await supabase
        .from('email_servers')
        .select('*')
        .eq('id', emailServerId)
        .eq('is_active', true)
        .single();
      if (error) {
        console.error('Error fetching email server by id:', error);
        throw new Error('Email server configuration not found');
      }
      emailServer = data;
    } else {
      const { data, error } = await supabase
        .from('email_servers')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();
      if (error) {
        console.error('No active email server found:', error);
        throw new Error('No active email server configured');
      }
      emailServer = data;
    }

    if (!emailServer) {
      throw new Error('No email server configuration available');
    }

    console.log('Using email server:', emailServer.name);

    // Decrypt password if encrypted with multiple fallbacks
    let smtpPassword = emailServer.smtp_password as string;
    if (emailServer.password_encrypted && typeof smtpPassword === 'string') {
      try {
        smtpPassword = await decryptPasswordFlexible(smtpPassword);
        console.log('SMTP password decrypted successfully (AES-GCM)');
      } catch (e1) {
        console.warn('AES-GCM decryption failed, trying DB RPC fallback...', e1?.message);
        try {
          const { data: plain, error: rpcError } = await supabase.rpc('decrypt_server_password', {
            encrypted_password: emailServer.smtp_password as string,
          });
          if (rpcError) throw rpcError;
          if (plain) {
            smtpPassword = plain as string;
            console.log('SMTP password decrypted via DB RPC');
          } else {
            throw new Error('DB RPC returned empty password');
          }
        } catch (e2) {
          console.warn('DB RPC decryption failed, trying simple base64 fallback...', e2?.message);
          try {
            const clean = (emailServer.smtp_password as string).startsWith('enc:')
              ? (emailServer.smtp_password as string).slice(4)
              : (emailServer.smtp_password as string);
            smtpPassword = new TextDecoder().decode(Uint8Array.from(atob(clean), c => c.charCodeAt(0)));
            console.log('SMTP password decoded via base64 fallback');
          } catch (e3) {
            console.error('All decryption strategies failed');
            throw new Error('Failed to decrypt email server password');
          }
        }
      }
    } else if (!emailServer.password_encrypted) {
      console.warn('WARNING: Email server password is not encrypted');
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

    // Send email using SMTP
    const smtpHost = String(emailServer.smtp_host || '').trim();
    const smtpPort = Number(emailServer.smtp_port) || 587;
    const smtpUsername = String(emailServer.smtp_username || '').trim();
    const senderEmail = String(emailServer.sender_email || '').trim();
    const senderName = String(emailServer.sender_name || 'Support Team').trim();
    const replyTo = String(emailServer.reply_to || senderEmail).trim();
    const smtpPasswordStr = String(smtpPassword || '').trim();

    console.log('SMTP config snapshot:', { host: smtpHost, port: smtpPort, tls: Boolean(emailServer.use_tls), username_preview: smtpUsername ? `${smtpUsername.slice(0,2)}***` : '', from: `${senderName} <${senderEmail}>` });

    // Basic validation before attempting SMTP
    if (!smtpHost || !smtpUsername || !smtpPasswordStr || !senderEmail) {
      const missing = {
        host: !smtpHost,
        username: !smtpUsername,
        password: !smtpPasswordStr,
        sender: !senderEmail,
      };
      console.error('SMTP config missing fields:', missing);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid SMTP configuration', details: missing }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: Boolean(emailServer.use_tls),
        auth: {
          username: smtpUsername,
          password: smtpPasswordStr,
        },
      },
    });

    await client.send({
      from: `${senderName} <${senderEmail}>`,
      to: customerEmail,
      replyTo: replyTo,
      subject: `[Ticket #${ticketId}] ${isResolution ? 'Resolved: ' : ''}${subject}`,
      html: emailHtml,
    });

    await client.close();

    console.log('Custom SMTP email sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully via SMTP',
        server: emailServer.name,
        encrypted: emailServer.password_encrypted
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-custom-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || String(error),
        name: error?.name || 'Error',
        stack: error?.stack || null,
        details: 'Failed to send email via SMTP. Please verify host, port, TLS, username and password. Outbound SMTP may also be blocked by the environment.' 
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