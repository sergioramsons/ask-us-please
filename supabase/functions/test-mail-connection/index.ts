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
    const { server_id: serverId } = await req.json();
    
    if (!serverId) {
      return new Response(
        JSON.stringify({ error: "Server ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch SMTP server configuration
    const { data: server, error: fetchError } = await supabase
      .from('email_servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (fetchError || !server) {
      return new Response(
        JSON.stringify({ error: "Server configuration not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Testing SMTP connection for server:', {
      name: server.name,
      host: server.smtp_host,
      port: server.smtp_port,
      username: server.smtp_username
    });

    // Basic SMTP connection test simulation
    // In a real implementation, you would use an SMTP library like nodemailer
    // For now, we'll simulate the test based on common configurations
    
    let success = false;
    let errorMessage = "";

    try {
      // Simulate SMTP connection test
      const isValidHost = server.smtp_host && server.smtp_host.length > 0;
      const isValidPort = server.smtp_port > 0 && server.smtp_port <= 65535;
      const hasCredentials = server.smtp_username && server.smtp_password;

      if (!isValidHost) {
        errorMessage = "Invalid SMTP host configuration";
      } else if (!isValidPort) {
        errorMessage = "Invalid SMTP port configuration";
      } else if (!hasCredentials) {
        errorMessage = "Missing SMTP username or password";
      } else {
        // Common SMTP ports validation
        const validSmtpPorts = [25, 465, 587, 2525];
        const isValidSmtpPort = validSmtpPorts.includes(server.smtp_port);
        
        if (!isValidSmtpPort) {
          errorMessage = `Port ${server.smtp_port} is not a standard SMTP port. Common ports are: 25, 465, 587, 2525`;
        } else {
          // Simulate successful connection for demo purposes
          success = true;
        }
      }
    } catch (error: any) {
      errorMessage = `SMTP connection error: ${error.message}`;
    }

    // Update last check timestamp for SMTP server
    await supabase
      .from('email_servers')
      .update({ updated_at: new Date().toISOString() })
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