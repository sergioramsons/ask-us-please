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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    console.log('Starting MIME content cleanup...');

    // Clean up tickets
    console.log('Cleaning up ticket descriptions...');
    const { data: ticketResults, error: ticketError } = await supabase
      .rpc('cleanup_mime_ticket_content');

    if (ticketError) {
      console.error('Error cleaning tickets:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Failed to clean tickets', details: ticketError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Clean up comments
    console.log('Cleaning up ticket comments...');
    const { data: commentResults, error: commentError } = await supabase
      .rpc('cleanup_mime_comment_content');

    if (commentError) {
      console.error('Error cleaning comments:', commentError);
      return new Response(
        JSON.stringify({ error: 'Failed to clean comments', details: commentError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const ticketCount = ticketResults?.length || 0;
    const commentCount = commentResults?.length || 0;

    console.log(`Cleanup completed - Tickets: ${ticketCount}, Comments: ${commentCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "MIME content cleanup completed",
        ticketsUpdated: ticketCount,
        commentsUpdated: commentCount,
        ticketResults: ticketResults || [],
        commentResults: commentResults || []
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error during cleanup:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to cleanup MIME content",
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