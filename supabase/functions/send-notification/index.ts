import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'comment_added' | 'sla_warning';
  ticketId: string;
  ticketTitle: string;
  ticketStatus?: string;
  ticketPriority?: string;
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  message?: string;
  ticketUrl?: string;
}

const getEmailTemplate = (notification: NotificationRequest) => {
  const baseUrl = 'https://760b20b2-f5c9-4523-90c9-014ee9f60579.lovableproject.com';
  const ticketUrl = `${baseUrl}/?ticket=${notification.ticketId}`;
  
  const templates = {
    ticket_created: {
      subject: `New Ticket Created: ${notification.ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; display: flex; align-items: center; gap: 10px;">
              🎧 New Support Ticket
            </h1>
          </div>
          <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">${notification.ticketTitle}</h2>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Ticket ID:</strong> #${notification.ticketId}</p>
              <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="text-transform: capitalize;">${notification.ticketPriority || 'Normal'}</span></p>
              <p style="margin: 5px 0;"><strong>Status:</strong> <span style="text-transform: capitalize;">${notification.ticketStatus || 'Open'}</span></p>
            </div>
            <a href="${ticketUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
              View Ticket
            </a>
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              You're receiving this because you have ticket notifications enabled. 
              <a href="${baseUrl}" style="color: #3b82f6;">Manage your preferences</a>
            </p>
          </div>
        </div>
      `
    },
    ticket_updated: {
      subject: `Ticket Updated: ${notification.ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; display: flex; align-items: center; gap: 10px;">
              📝 Ticket Updated
            </h1>
          </div>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">${notification.ticketTitle}</h2>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Ticket ID:</strong> #${notification.ticketId}</p>
              <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="text-transform: capitalize;">${notification.ticketStatus}</span></p>
              ${notification.senderName ? `<p style="margin: 5px 0;"><strong>Updated by:</strong> ${notification.senderName}</p>` : ''}
              ${notification.message ? `<p style="margin: 10px 0; padding: 10px; background: #f1f5f9; border-radius: 4px;"><strong>Note:</strong> ${notification.message}</p>` : ''}
            </div>
            <a href="${ticketUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
              View Ticket
            </a>
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              You're receiving this because you have ticket notifications enabled.
            </p>
          </div>
        </div>
      `
    },
    comment_added: {
      subject: `New Comment on: ${notification.ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; display: flex; align-items: center; gap: 10px;">
              💬 New Comment
            </h1>
          </div>
          <div style="background: #faf5ff; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">${notification.ticketTitle}</h2>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Ticket ID:</strong> #${notification.ticketId}</p>
              ${notification.senderName ? `<p style="margin: 5px 0;"><strong>Comment by:</strong> ${notification.senderName}</p>` : ''}
              ${notification.message ? `<div style="margin: 15px 0; padding: 15px; background: #f1f5f9; border-left: 4px solid #7c3aed; border-radius: 4px;"><strong>Comment:</strong><br/>${notification.message}</div>` : ''}
            </div>
            <a href="${ticketUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
              Reply to Ticket
            </a>
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              You're receiving this because you have ticket notifications enabled.
            </p>
          </div>
        </div>
      `
    },
    sla_warning: {
      subject: `⚠️ SLA Warning: ${notification.ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; display: flex; align-items: center; gap: 10px;">
              ⚠️ SLA Warning
            </h1>
          </div>
          <div style="background: #fef2f2; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">${notification.ticketTitle}</h2>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 5px 0;"><strong>Ticket ID:</strong> #${notification.ticketId}</p>
              <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="text-transform: capitalize; color: #dc2626; font-weight: bold;">${notification.ticketPriority}</span></p>
              <p style="margin: 5px 0; color: #dc2626;"><strong>⚠️ This ticket is approaching its SLA deadline</strong></p>
            </div>
            <a href="${ticketUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
              Take Action Now
            </a>
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              This is an automated SLA warning notification.
            </p>
          </div>
        </div>
      `
    }
  };

  return templates[notification.type] || templates.ticket_updated;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const notification: NotificationRequest = await req.json();
    console.log('Processing notification:', notification);

    // Validate required fields
    if (!notification.type || !notification.ticketId || !notification.recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, ticketId, recipientEmail" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has notifications enabled (in a real app, you'd check user preferences)
    // For now, we'll assume notifications are enabled

    const template = getEmailTemplate(notification);
    const fromEmail = "BS-HelpDesk <support@yourdomain.com>";

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [notification.recipientEmail],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the notification in the database (optional)
    try {
      await supabase.from('email_server_audit').insert({
        action: 'NOTIFICATION_SENT',
        details: {
          type: notification.type,
          ticket_id: notification.ticketId,
          recipient: notification.recipientEmail,
          email_id: emailResponse.data?.id
        }
      });
    } catch (logError) {
      console.warn("Failed to log notification:", logError);
      // Don't fail the whole operation if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id,
        message: "Notification sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send notification",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);