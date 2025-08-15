import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TicketEmailRequest {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  agentName: string;
  ticketStatus: string;
  priority: string;
  isResolution?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing ticket email request");
    
    const {
      ticketId,
      customerName,
      customerEmail,
      subject,
      message,
      agentName,
      ticketStatus,
      priority,
      isResolution = false
    }: TicketEmailRequest = await req.json();

    console.log("Email request data:", { ticketId, customerEmail, subject });

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
              <p>Best regards,<br>The Support Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message from our support system.</p>
              <p>Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Support Team <support@yourdomain.com>",
      to: [customerEmail],
      subject: `[Ticket #${ticketId}] ${isResolution ? 'Resolved: ' : ''}${subject}`,
      html: emailHtml,
      headers: {
        'X-Ticket-ID': ticketId,
        'X-Priority': priority,
      },
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id,
        message: "Email sent successfully" 
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
    console.error("Error in send-ticket-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: "Failed to send email. Please check your email configuration." 
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