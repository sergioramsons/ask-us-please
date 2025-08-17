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
    
    // Build API URL
    const base = threeCXApiUrl.startsWith('http') ? threeCXApiUrl : `https://${threeCXApiUrl}`;
    const path = request.threeCXPath || '/xapi/v1/Calls';
    const endpoint = new URL(path.startsWith('/') ? path : `/${path}`, base);

    let results = [];

    if (request.action === 'single' && request.phoneNumber) {
      // Make a single call
      logStep("Making single call", { number: request.phoneNumber, extension: request.extension });
      
      const callPayload = {
        caller: request.extension || '100', // Default extension
        callee: request.phoneNumber,
        timeout: 30 // 30 seconds timeout
      };

      const response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(callPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`3CX API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      results.push({
        phoneNumber: request.phoneNumber,
        status: 'initiated',
        callId: result.callId || result.id,
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

          const callPayload = {
            caller: extension,
            callee: phoneNumber,
            timeout: 30
          };

          const response = await fetch(endpoint.toString(), {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(callPayload)
          });

          let result;
          if (response.ok) {
            result = await response.json();
            results.push({
              phoneNumber,
              status: 'initiated',
              callId: result.callId || result.id,
              timestamp: new Date().toISOString(),
              attempt: 1
            });
          } else {
            const errorText = await response.text();
            results.push({
              phoneNumber,
              status: 'failed',
              error: `API error: ${response.status} - ${errorText}`,
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