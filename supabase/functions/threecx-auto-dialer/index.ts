import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DialRequest {
  action: 'start' | 'stop' | 'pause' | 'resume' | 'single';
  phoneNumbers?: string[];
  phoneNumber?: string;
  extension?: string;
  // 3CX credentials
  threeCXUrl?: string;
  threeCXUsername?: string;
  threeCXPassword?: string;
  threeCXPath?: string;
  // Campaign settings
  campaignName?: string;
  dialDelay?: number; // seconds between calls
  maxAttempts?: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[3CX-AUTO-DIALER] ${step}${detailsStr}`);
};


async function tryInitiateCall(base: string, authHeader: string, extension: string, number: string, requestedPath?: string, username?: string, password?: string) {
  const buildUrl = (p: string) => new URL(p.startsWith('/') ? p : `/${p}`, base).toString();

  // For v20, try session authentication first if using webclient API
  if (requestedPath?.includes('/webclient/api/call/new')) {
    try {
      logStep('Attempting v20 session authentication...');
      
      // Login to get session
      const loginResponse = await fetch(buildUrl('/webclient/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Helpdesk-Auto-Dialer/1.0'
        },
        body: JSON.stringify({
          Username: username,
          Password: password
        })
      });

      if (loginResponse.ok) {
        // Extract session cookie
        const setCookieHeader = loginResponse.headers.get('set-cookie');
        const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';
        
        logStep('Login successful, making call with session...');

        // Make call with session
        const callResponse = await fetch(buildUrl(requestedPath), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie,
            'User-Agent': 'Helpdesk-Auto-Dialer/1.0'
          },
          body: JSON.stringify({
            destination: number,
            callerid: extension
          })
        });

        if (callResponse.ok) {
          let body: any = null;
          try { body = await callResponse.json(); } catch { body = await callResponse.text(); }
          return { ok: true, body, path: requestedPath, payload: { destination: number, callerid: extension } };
        } else {
          const text = await callResponse.text();
          logStep('Session call failed', { path: requestedPath, status: callResponse.status, text });
        }
      } else {
        logStep('Login failed', { status: loginResponse.status, text: await loginResponse.text() });
      }
    } catch (e) {
      logStep('Session auth exception', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  // Fallback to trying all endpoints with Basic Auth
  const candidates: { path: string; payloads: any[] }[] = [
    { path: requestedPath || '/webclient/api/call/new', payloads: [ { destination: number, callerid: extension } ] },
    { path: '/xapi/MakeCall', payloads: [ { From: extension, To: number }, { from: extension, to: number }, { caller: extension, callee: number, timeout: 30 } ] },
    { path: '/xapi/v1/Calls', payloads: [ { caller: extension, callee: number, timeout: 30 } ] },
  ];

  for (const candidate of candidates) {
    for (const payload of candidate.payloads) {
      try {
        const res = await fetch(buildUrl(candidate.path), {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Helpdesk-Auto-Dialer/1.0'
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          let body: any = null;
          try { body = await res.json(); } catch { body = await res.text(); }
          return { ok: true, body, path: candidate.path, payload };
        }
        const text = await res.text();
        logStep('Attempt failed', { path: candidate.path, status: res.status, text });
      } catch (e) {
        logStep('Attempt exception', { path: candidate.path, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return { ok: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Auto dialer function started");

    const request: DialRequest = await req.json();
    logStep("Request received", { action: request.action, phoneCount: request.phoneNumbers?.length });

    // Use credentials from request or fallback to environment
    const threeCXApiUrl = request.threeCXUrl || Deno.env.get('THREECX_API_URL');
    const threeCXUsername = request.threeCXUsername || Deno.env.get('THREECX_API_USERNAME');
    const threeCXPassword = request.threeCXPassword || Deno.env.get('THREECX_API_PASSWORD');

    if (!threeCXApiUrl || !threeCXUsername || !threeCXPassword) {
      throw new Error('3CX API credentials not configured. Please provide threeCXUrl, threeCXUsername, and threeCXPassword.');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');

    logStep("User authenticated", { userId: user.id });

    // Create authentication header for 3CX API
    const auth = btoa(`${threeCXUsername}:${threeCXPassword}`);
    
    // Build and sanitize API URL for 3CX call initiation
    const rawUrl = (threeCXApiUrl || '').trim();
    const sanitizedBase = rawUrl.replace(/^httpps:\/\//i, 'https://');
    const base = sanitizedBase.startsWith('http') ? sanitizedBase : `https://${sanitizedBase}`;
    logStep('3CX base URL', { base });
    // Use the correct 3CX Web Client API path for initiating calls
    const path = request.threeCXPath || '/webclient/api/call/new';
    const endpoint = new URL(path.startsWith('/') ? path : `/${path}`, base);

    let results = [];

    if (request.action === 'single' && request.phoneNumber) {
      const ext = request.extension || '100';
      const attempt = await tryInitiateCall(base, auth, ext, request.phoneNumber, request.threeCXPath, threeCXUsername, threeCXPassword);
      if (!attempt.ok) {
        throw new Error('3CX API call initiation failed across all known endpoints. Check logs for details.');
      }
      results.push({
        phoneNumber: request.phoneNumber,
        status: 'initiated',
        callId: attempt.body?.callId || attempt.body?.id || attempt.body?.call_id || undefined,
        timestamp: new Date().toISOString()
      });

    } else if (request.action === 'start' && request.phoneNumbers) {
      // Start auto dialer campaign
      logStep("Starting auto dialer campaign", { 
        phoneCount: request.phoneNumbers.length,
        delay: request.dialDelay || 5
      });

      const delay = (request.dialDelay || 5) * 1000; // Convert to milliseconds
      const extension = request.extension || '100';

      for (let i = 0; i < request.phoneNumbers.length; i++) {
        const phoneNumber = request.phoneNumbers[i];
        
        try {
          logStep(`Dialing ${i + 1}/${request.phoneNumbers.length}`, { number: phoneNumber });

          const attempt = await tryInitiateCall(base, auth, extension, phoneNumber, request.threeCXPath, threeCXUsername, threeCXPassword);
          if (attempt.ok) {
            results.push({
              phoneNumber,
              status: 'initiated',
              callId: attempt.body?.callId || attempt.body?.id || attempt.body?.call_id || undefined,
              timestamp: new Date().toISOString(),
              attempt: 1
            });
          } else {
            results.push({
              phoneNumber,
              status: 'failed',
              error: 'All known endpoints failed (see function logs for details).',
              timestamp: new Date().toISOString(),
              attempt: 1
            });
          }

          // Wait before next call (except for the last one)
          if (i < request.phoneNumbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (error) {
          results.push({
            phoneNumber,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            attempt: 1
          });
        }
      }
    }

    logStep("Auto dialer completed", { resultsCount: results.length });

    return new Response(JSON.stringify({ 
      success: true, 
      action: request.action,
      results,
      campaign: {
        name: request.campaignName,
        totalNumbers: request.phoneNumbers?.length || 1,
        completed: results.length,
        successful: results.filter(r => r.status === 'initiated').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});