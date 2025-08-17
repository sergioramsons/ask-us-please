import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TicketEmail } from './_templates/ticket-email.tsx'
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
  agentSignature?: string;
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
      agentSignature,
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

    // Generate email HTML using React Email
    const emailHtml = await renderAsync(
      React.createElement(TicketEmail, {
        customerName,
        ticketId,
        ticketSubject: subject,
        ticketStatus,
        ticketPriority: priority,
        agentName,
        agentSignature,
        message,
        isResolution,
      })
    );

    // Send email using SMTP
    const smtpHost = String(emailServer.smtp_host || '').trim();
    const smtpPort = Number(emailServer.smtp_port) || 587;
    const smtpUsername = String(emailServer.smtp_username || '').trim();
    const senderEmail = String(emailServer.sender_email || '').trim();
    const senderName = String(emailServer.sender_name || 'Support Team').trim();
    const replyTo = String(emailServer.reply_to || senderEmail).trim();
    const smtpPasswordStr = String(smtpPassword || '').trim();

    // Enforce STARTTLS for submission ports
    const effectiveTLS = (smtpPort === 587 || smtpPort === 465) ? true : Boolean(emailServer.use_tls);

    console.log('SMTP config snapshot:', { 
      host: smtpHost, 
      port: smtpPort, 
      tls: effectiveTLS, 
      username_preview: smtpUsername ? `${smtpUsername.slice(0,2)}***` : '', 
      username_length: smtpUsername?.length || 0,
      password_length: smtpPasswordStr?.length || 0,
      from: `${senderName} <${senderEmail}>` 
    });

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
        tls: effectiveTLS,
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