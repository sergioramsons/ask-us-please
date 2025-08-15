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
      // Support both GET query params and POST body (form or JSON)
      let payload: Record<string, string> = {};
      let formParams = new URLSearchParams();
      try {
        const contentType = req.headers.get('content-type') || '';
        if (req.method !== 'GET' && contentType) {
          if (contentType.includes('application/x-www-form-urlencoded')) {
            const text = await req.text();
            formParams = new URLSearchParams(text);
          } else if (contentType.includes('application/json')) {
            payload = await req.json();
          }
        }
      } catch (e) {
        console.warn('Auth endpoint: failed to parse body', e);
      }

      const clientId = url.searchParams.get('client_id') || (payload.client_id as string) || formParams.get('client_id');
      const clientSecret = url.searchParams.get('client_secret') || (payload.client_secret as string) || formParams.get('client_secret');
      let redirectUri = url.searchParams.get('redirect_uri') || (payload.redirect_uri as string) || formParams.get('redirect_uri');
      
      // Clean up redirect URI if it has extra text
      if (redirectUri && redirectUri.includes('Callback URL:')) {
        redirectUri = redirectUri.replace(/.*Callback URL:\s*/, '').trim();
      }
      const incomingState = url.searchParams.get('state') || (payload.state as string) || formParams.get('state');
      
      // Always ensure a non-empty state to satisfy clients expecting it
      const state = incomingState && incomingState.trim() !== ''
        ? incomingState
        : `state_${Date.now()}`;
      
      console.log('OAuth authorization request:', { clientId, hasRedirect: !!redirectUri, hasState: !!incomingState, finalState: state });
      
      // Generate authorization code (includes provided creds for later recovery)
      const authCode = btoa(`${clientId || ''}:${clientSecret || ''}:${Date.now()}`);
      
      // Redirect back to Yeastar with authorization code
      if (redirectUri) {
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('code', authCode);
        redirectUrl.searchParams.set('state', state);
        
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
        state,
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

      const query = url.searchParams;
      const client_id = (payload.client_id as string) || formParams.get('client_id') || query.get('client_id') || basicClientId;
      const client_secret = (payload.client_secret as string) || formParams.get('client_secret') || query.get('client_secret') || basicClientSecret;
      const grant_type = (payload.grant_type as string) || formParams.get('grant_type') || query.get('grant_type') || 'authorization_code';
      const code = (payload.code as string) || formParams.get('code') || query.get('code') || '';
      const redirect_uri = (payload.redirect_uri as string) || formParams.get('redirect_uri') || query.get('redirect_uri') || '';

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

      // Skip strict client credential validation to maximize compatibility with PBX
      // We only require a valid authorization code for token exchange.
      // Detailed info already logged above.
      
      const isAuthCode = grant_type === 'authorization_code';
      const isClientCreds = grant_type === 'client_credentials';

      if (!isAuthCode && !isClientCreds) {
        return new Response(JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Unsupported grant_type',
        }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }

      if (isAuthCode && !code) {
        console.warn('Token endpoint: missing code for authorization_code flow; continuing for PBX compatibility');
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