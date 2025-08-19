import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

    let success = false;
    let errorMessage = "";

    try {
      // Create SMTP client for real connection testing
      const client = new SMTPClient({
        connection: {
          hostname: server.smtp_host,
          port: server.smtp_port,
          tls: server.use_tls,
          auth: {
            username: server.smtp_username,
            password: server.smtp_password,
          },
        },
      });

      // Try to connect and authenticate
      await client.connect();
      console.log('SMTP connection established successfully');
      
      // Close the connection
      await client.close();
      
      success = true;
    } catch (error: any) {
      console.error('SMTP connection failed:', error);
      
      // Provide helpful error messages based on common issues
      if (error.message?.includes('ENOTFOUND')) {
        errorMessage = `Cannot resolve hostname: ${server.smtp_host}. Please check the SMTP server address.`;
      } else if (error.message?.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused on port ${server.smtp_port}. Please check the port number and firewall settings.`;
      } else if (error.message?.includes('Authentication failed')) {
        errorMessage = 'Authentication failed. Please check your username and password.';
      } else if (error.message?.includes('certificate')) {
        errorMessage = 'SSL/TLS certificate error. Try disabling TLS or check certificate settings.';
      } else {
        errorMessage = `SMTP connection error: ${error.message}`;
      }
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