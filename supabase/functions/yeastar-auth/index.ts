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
  client_id?: string;
  client_secret?: string;
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
}

const EXPECTED_CLIENT_ID = Deno.env.get('YEASTAR_CLIENT_ID') || '';
const EXPECTED_CLIENT_SECRET = Deno.env.get('YEASTAR_CLIENT_SECRET') || '';

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
      const redirectUri = url.searchParams.get('redirect_uri');
      const state = url.searchParams.get('state');
      
      console.log('OAuth authorization request:', { clientId, redirectUri, state });
      
      // Generate authorization code
      const authCode = btoa(`${clientId}:${clientSecret}:${Date.now()}`);
      
      // Redirect back to Yeastar with authorization code
      if (redirectUri) {
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('code', authCode);
        if (state) {
          redirectUrl.searchParams.set('state', state);
        }
        
        console.log('Redirecting to:', redirectUrl.toString());
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': redirectUrl.toString(),
            ...corsHeaders
          }
        });
      }
      
      // Fallback if no redirect_uri
      return new Response(JSON.stringify({
        authorization_code: authCode,
        expires_in: 3600
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    
    // Handle token endpoint (support both /oauth/tokens and /oauth/token)
    if (url.pathname.includes('/oauth/tokens') || url.pathname.includes('/oauth/token')) {
      const contentType = req.headers.get('content-type') || '';
      const authHeader = req.headers.get('authorization') || '';

      let basicClientId = '';
      let basicClientSecret = '';
      if (authHeader.startsWith('Basic ')) {
        try {
          const decoded = atob(authHeader.replace('Basic ', ''));
          const [id, secret] = decoded.split(':');
          basicClientId = id || '';
          basicClientSecret = secret || '';
        } catch (_) {
          // ignore malformed basic auth
        }
      }

      let payload: Record<string, string> = {};
      let formParams = new URLSearchParams();

      try {
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const text = await req.text();
          formParams = new URLSearchParams(text);
        } else if (contentType.includes('application/json')) {
          payload = await req.json();
        } else {
          // Try to parse as form as a fallback
          const text = await req.text();
          formParams = new URLSearchParams(text);
        }
      } catch (e) {
        console.error('Failed to parse token request body:', e);
      }

      const client_id = (payload.client_id as string) || formParams.get('client_id') || basicClientId;
      const client_secret = (payload.client_secret as string) || formParams.get('client_secret') || basicClientSecret;
      const grant_type = (payload.grant_type as string) || formParams.get('grant_type') || 'authorization_code';
      const code = (payload.code as string) || formParams.get('code') || '';
      const redirect_uri = (payload.redirect_uri as string) || formParams.get('redirect_uri') || '';

      // Try to recover client credentials from the authorization code itself (format: clientId:clientSecret:timestamp)
      let codeClientId = '';
      let codeClientSecret = '';
      try {
        const decoded = atob(code || '');
        const [cid, csec] = decoded.split(':');
        codeClientId = cid || '';
        codeClientSecret = csec || '';
      } catch (_) {
        // ignore if code is not decodable
      }

      // Prefer explicit credentials; fall back to those embedded in the code
      const effectiveClientId = client_id || codeClientId;
      const effectiveClientSecret = client_secret || codeClientSecret;

      console.log('Token request received', {
        hasClientId: !!client_id,
        hasClientSecret: !!client_secret,
        grant_type,
        hasCode: !!code,
        hasRedirect: !!redirect_uri,
        fromCode: { hasId: !!codeClientId, hasSecret: !!codeClientSecret }
      });

      // Validate client credentials against stored secrets if provided
      if (EXPECTED_CLIENT_ID && EXPECTED_CLIENT_SECRET) {
        const idMatch = effectiveClientId === EXPECTED_CLIENT_ID;
        const secretMatch = effectiveClientSecret === EXPECTED_CLIENT_SECRET;
        console.log('Client validation check', { idMatch, secretMatch, providedClientId: effectiveClientId, source: client_id ? 'body/basic' : 'code' });
        if (!idMatch || !secretMatch) {
          const reason = !idMatch && !secretMatch
            ? 'client_id_and_secret_mismatch'
            : (!idMatch ? 'client_id_mismatch' : 'client_secret_mismatch');
          return new Response(JSON.stringify({
            error: 'invalid_client',
            error_description: reason,
          }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
      } else {
        // If secrets are not configured, ensure some creds are present
        if (!effectiveClientId || !effectiveClientSecret) {
          return new Response(JSON.stringify({
            error: 'invalid_client',
            error_description: 'Client credentials missing',
          }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
      }

      if (grant_type !== 'authorization_code' || !code) {
        return new Response(JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Unsupported grant_type or missing code',
        }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      const accessToken = btoa(`${effectiveClientId}:${Date.now()}`);
      const refreshToken = btoa(`${accessToken}:refresh`);

      return new Response(JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        refresh_token: refreshToken,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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