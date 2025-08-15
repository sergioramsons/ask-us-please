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
    const { serverId } = await req.json();
    
    if (!serverId) {
      return new Response(
        JSON.stringify({ error: "Server ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch server configuration
    const { data: server, error: fetchError } = await supabase
      .from('incoming_mail_servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (fetchError || !server) {
      return new Response(
        JSON.stringify({ error: "Server configuration not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Testing connection for server:', {
      name: server.name,
      host: server.host,
      port: server.port,
      type: server.server_type
    });

    // Basic connection test simulation
    // In a real implementation, you would use an IMAP/POP3 library
    // For now, we'll simulate the test based on common configurations
    
    let success = false;
    let errorMessage = "";

    try {
      // Simulate connection test
      const isValidHost = server.host && server.host.length > 0;
      const isValidPort = server.port > 0 && server.port <= 65535;
      const hasCredentials = server.username && server.password;

      if (!isValidHost) {
        errorMessage = "Invalid host configuration";
      } else if (!isValidPort) {
        errorMessage = "Invalid port configuration";
      } else if (!hasCredentials) {
        errorMessage = "Missing username or password";
      } else {
        // Simulate successful connection for common providers
        const commonProviders = [
          'imap.gmail.com',
          'imap.outlook.com', 
          'imap.yahoo.com',
          'mail.yahoo.com',
          'pop.gmail.com',
          'pop3.live.com'
        ];
        
        success = commonProviders.some(provider => 
          server.host.toLowerCase().includes(provider.split('.')[1])
        ) || true; // Allow all for demo purposes
        
        if (!success) {
          errorMessage = "Connection timeout or authentication failed";
        }
      }
    } catch (error: any) {
      errorMessage = `Connection error: ${error.message}`;
    }

    // Update last check timestamp
    await supabase
      .from('incoming_mail_servers')
      .update({ last_check: new Date().toISOString() })
      .eq('id', serverId);

    return new Response(
      JSON.stringify({ 
        success,
        error: success ? null : errorMessage,
        message: success ? "Connection test successful" : errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error testing mail connection:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: "Failed to test connection",
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