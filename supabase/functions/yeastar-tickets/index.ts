import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    if (req.method === "POST") {
      // Create new ticket
      const body = await req.json();
      const ticketData = body.ticket;
      
      // Generate ticket number
      const { data: ticketNumber, error: rpcError } = await supabase
        .rpc('generate_ticket_number');
      
      if (rpcError) throw rpcError;

      // Determine priority based on tags
      let priority = 'medium';
      if (ticketData.tags?.includes('urgent') || ticketData.tags?.includes('emergency')) {
        priority = 'urgent';
      } else if (ticketData.tags?.includes('high') || ticketData.tags?.includes('important')) {
        priority = 'high';
      }

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          ticket_number: ticketNumber,
          subject: ticketData.subject,
          description: ticketData.description,
          priority: priority,
          status: ticketData.status || 'open',
          contact_id: ticketData.requester_id
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial comment
      if (ticketData.comment?.body) {
        await supabase
          .from('ticket_comments')
          .insert({
            ticket_id: ticket.id,
            content: ticketData.comment.body,
            is_internal: false,
          });
      }

      return new Response(JSON.stringify({
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.created_at
        }
      }), {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    if (req.method === "PUT" || req.method === "PATCH") {
      // Update ticket (for call journal)
      const pathParts = url.pathname.split('/');
      const ticketId = pathParts[pathParts.length - 1].replace('.json', '');
      
      const body = await req.json();
      const ticketData = body.ticket;
      
      // Handle voice comment (call recording)
      if (ticketData.voice_comment) {
        const voiceComment = ticketData.voice_comment;
        const commentBody = `Call Recording\nFrom: ${voiceComment.from}\nTo: ${voiceComment.to}\nDuration: ${voiceComment.call_duration}s\nStarted: ${voiceComment.started_at}\nRecording: ${voiceComment.recording_url}`;
        
        await supabase
          .from('ticket_comments')
          .insert({
            ticket_id: ticketId,
            content: commentBody,
            is_internal: false,
          });
      }
      
      // Handle regular comment
      if (ticketData.comment?.body) {
        await supabase
          .from('ticket_comments')
          .insert({
            ticket_id: ticketId,
            content: ticketData.comment.body,
            is_internal: !ticketData.comment.public,
          });
      }

      return new Response(JSON.stringify({
        ticket: {
          id: ticketId,
          updated_at: new Date().toISOString()
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    if (req.method === "GET") {
      // Get ticket details
      const pathParts = url.pathname.split('/');
      const ticketId = pathParts[pathParts.length - 1];
      
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      error: "method_not_allowed"
    }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in yeastar-tickets:", error);
    return new Response(JSON.stringify({
      error: "internal_error",
      error_description: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);