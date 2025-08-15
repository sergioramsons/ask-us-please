import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface AuthRequest {
  client_id: string;
  client_secret: string;
  grant_type: string;
  code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle OAuth authorization endpoint
    if (url.pathname.includes('/oauth/authorizations/new')) {
      const clientId = url.searchParams.get('client_id');
      const clientSecret = url.searchParams.get('client_secret');
      
      // For simplicity, we'll generate a static authorization code
      // In production, you'd want proper OAuth flow
      const authCode = btoa(`${clientId}:${clientSecret}:${Date.now()}`);
      
      return new Response(JSON.stringify({
        authorization_code: authCode,
        expires_in: 3600
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Handle token endpoint
    if (url.pathname.includes('/oauth/tokens')) {
      const body: AuthRequest = await req.json();
      
      // Validate client credentials (in production, store these securely)
      if (body.client_id && body.client_secret) {
        // Generate access token
        const accessToken = btoa(`${body.client_id}:${Date.now()}`);
        
        return new Response(JSON.stringify({
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: 3600,
          scope: "read write"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      return new Response(JSON.stringify({
        error: "invalid_client",
        error_description: "Invalid client credentials"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      error: "not_found",
      error_description: "Endpoint not found"
    }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in yeastar-auth:", error);
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