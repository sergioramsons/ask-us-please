import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallLogFilter {
  dateFrom?: string;
  dateTo?: string;
  phoneNumber?: string;
  extension?: string;
  callType?: 'inbound' | 'outbound' | 'internal';
  limit?: number;
  // 3CX credentials from UI
  threeCXUrl?: string;
  threeCXUsername?: string;
  threeCXPassword?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[3CX-CALL-LOGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body for filters and credentials
    const filters: CallLogFilter = req.method === 'POST' ? await req.json() : {};
    logStep("Filters received", filters);

    // Use credentials from request or fallback to environment
    const threeCXApiUrl = filters.threeCXUrl || Deno.env.get('THREECX_API_URL');
    const threeCXUsername = filters.threeCXUsername || Deno.env.get('THREECX_API_USERNAME');
    const threeCXPassword = filters.threeCXPassword || Deno.env.get('THREECX_API_PASSWORD');

    if (!threeCXApiUrl || !threeCXUsername || !threeCXPassword) {
      throw new Error('3CX API credentials not configured. Please provide threeCXUrl, threeCXUsername, and threeCXPassword in request.');
    }

    logStep("3CX credentials verified", { url: threeCXApiUrl, username: threeCXUsername });

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
    
    // Build API URL with query parameters
    const url = new URL(`${threeCXApiUrl}/api/ActivationManager/CallHistory`);
    
    // Add date filters (default to last 7 days if not specified)
    const dateTo = filters.dateTo || new Date().toISOString().split('T')[0];
    const dateFrom = filters.dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    url.searchParams.append('dateFrom', dateFrom);
    url.searchParams.append('dateTo', dateTo);
    
    if (filters.phoneNumber) {
      url.searchParams.append('phoneNumber', filters.phoneNumber);
    }
    
    if (filters.extension) {
      url.searchParams.append('extension', filters.extension);
    }
    
    if (filters.callType) {
      url.searchParams.append('callType', filters.callType);
    }
    
    const limit = filters.limit || 100;
    url.searchParams.append('limit', limit.toString());

    logStep("Making API request to 3CX", { url: url.toString() });

    // Make request to 3CX API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("3CX API error", { status: response.status, error: errorText });
      throw new Error(`3CX API error: ${response.status} - ${errorText}`);
    }

    const callLogs = await response.json();
    logStep("Call logs retrieved", { count: callLogs?.length || 0 });

    // Transform the data to a consistent format
    const transformedLogs = Array.isArray(callLogs) ? callLogs.map((log: any) => ({
      id: log.id || log.callId,
      callDate: log.timeStart || log.callDate,
      duration: log.duration,
      caller: log.caller || log.from,
      callee: log.callee || log.to,
      extension: log.extension,
      callType: log.type || log.callType,
      status: log.status || log.callStatus,
      recording: log.recording || log.recordingPath,
      cost: log.cost,
      timeEnd: log.timeEnd,
      timeStart: log.timeStart,
      ringDuration: log.ringDuration,
      talkDuration: log.talkDuration
    })) : [];

    logStep("Data transformed", { count: transformedLogs.length });

    return new Response(JSON.stringify({ 
      success: true, 
      data: transformedLogs,
      filters: {
        dateFrom,
        dateTo,
        ...filters
      },
      total: transformedLogs.length
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