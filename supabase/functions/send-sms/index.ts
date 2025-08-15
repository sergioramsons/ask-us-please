import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SMSRequest {
  destination: string;
  message: string;
  source?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destination, message, source = 'BernsergIT' }: SMSRequest = await req.json();

    console.log('Sending SMS:', { destination, message, source });

    // Validate destination number
    if (!destination || destination.length < 10) {
      throw new Error('Invalid destination number');
    }

    // Clean destination number (remove + if present)
    const cleanDestination = destination.replace(/^\+/, '');

    // SMS API configuration - using secure environment variables
    const smsApiUser = Deno.env.get('SMS_API_USER');
    const smsApiPassword = Deno.env.get('SMS_API_PASSWORD');
    
    if (!smsApiUser || !smsApiPassword) {
      console.error('SMS API credentials not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construct SMS API URL
    const apiUrl = new URL('https://api.rmlconnect.net:8443/bulksms/bulksms');
    apiUrl.searchParams.set('username', smsApiUser);
    apiUrl.searchParams.set('password', smsApiPassword);
    apiUrl.searchParams.set('type', '0');
    apiUrl.searchParams.set('dlr', '1');
    apiUrl.searchParams.set('destination', cleanDestination);
    apiUrl.searchParams.set('source', source);
    apiUrl.searchParams.set('message', message);

    console.log('SMS API URL:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('SMS API Response:', { status: response.status, body: responseText });

    if (!response.ok) {
      throw new Error(`SMS API error: ${response.status} - ${responseText}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'SMS sent successfully',
      response: responseText 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);