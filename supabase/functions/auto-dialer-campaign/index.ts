import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignRequest {
  action: 'create' | 'start' | 'pause' | 'stop' | 'get_status' | 'get_next_number' | 'update_result';
  campaignId?: string;
  name?: string;
  phoneNumbers?: string[];
  agentExtension?: string;
  delaySeconds?: number;
  // For call results
  phoneNumber?: string;
  status?: 'dialing' | 'connected' | 'busy' | 'no_answer' | 'failed' | 'cancelled';
  callId?: string;
  callDuration?: number;
  errorMessage?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-DIALER-CAMPAIGN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Campaign API function started");

    const request: CampaignRequest = await req.json();
    logStep("Request received", { action: request.action });

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader && request.action !== 'get_next_number' && request.action !== 'update_result') {
      throw new Error('No authorization header provided');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let user = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      user = userData.user;
    }

    switch (request.action) {
      case 'create': {
        if (!user) throw new Error('Authentication required');
        
        // Get user's organization
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (!profile) throw new Error('User profile not found');

        const { data: campaign, error } = await supabaseClient
          .from('auto_dialer_campaigns')
          .insert({
            name: request.name,
            organization_id: profile.organization_id,
            agent_extension: request.agentExtension,
            delay_seconds: request.delaySeconds || 5,
            phone_numbers: request.phoneNumbers,
            total_calls: request.phoneNumbers?.length || 0,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          campaign 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'start': {
        if (!user) throw new Error('Authentication required');
        
        const { error } = await supabaseClient
          .from('auto_dialer_campaigns')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString()
          })
          .eq('id', request.campaignId)
          .eq('created_by', user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Campaign started'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'pause': {
        if (!user) throw new Error('Authentication required');
        
        const { error } = await supabaseClient
          .from('auto_dialer_campaigns')
          .update({ status: 'paused' })
          .eq('id', request.campaignId)
          .eq('created_by', user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Campaign paused'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'stop': {
        if (!user) throw new Error('Authentication required');
        
        const { error } = await supabaseClient
          .from('auto_dialer_campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', request.campaignId)
          .eq('created_by', user.id);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Campaign stopped'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_next_number': {
        // This endpoint is called by 3CX Call Flow
        const { data: campaign, error } = await supabaseClient
          .from('auto_dialer_campaigns')
          .select('*')
          .eq('id', request.campaignId)
          .eq('status', 'running')
          .single();

        if (error || !campaign) {
          return new Response(JSON.stringify({ 
            success: false,
            hasNext: false,
            message: 'Campaign not found or not running'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const currentIndex = campaign.current_index;
        const phoneNumbers = campaign.phone_numbers;

        if (currentIndex >= phoneNumbers.length) {
          // Campaign completed
          await supabaseClient
            .from('auto_dialer_campaigns')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', request.campaignId);

          return new Response(JSON.stringify({ 
            success: true,
            hasNext: false,
            message: 'Campaign completed'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const nextNumber = phoneNumbers[currentIndex];
        
        // Update current index
        await supabaseClient
          .from('auto_dialer_campaigns')
          .update({ current_index: currentIndex + 1 })
          .eq('id', request.campaignId);

        return new Response(JSON.stringify({ 
          success: true,
          hasNext: true,
          phoneNumber: nextNumber,
          agentExtension: campaign.agent_extension,
          delaySeconds: campaign.delay_seconds,
          currentIndex: currentIndex + 1,
          totalNumbers: phoneNumbers.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update_result': {
        // This endpoint is called by 3CX Call Flow to report results
        const { error } = await supabaseClient
          .from('auto_dialer_results')
          .insert({
            campaign_id: request.campaignId,
            phone_number: request.phoneNumber,
            status: request.status,
            call_duration: request.callDuration,
            call_id: request.callId,
            error_message: request.errorMessage,
            connected_at: request.status === 'connected' ? new Date().toISOString() : null,
            disconnected_at: ['connected', 'busy', 'no_answer'].includes(request.status!) ? new Date().toISOString() : null
          });

        if (error) throw error;

        // Update campaign counters
        const increment = request.status === 'connected' ? 'successful_calls' : 'failed_calls';
        await supabaseClient
          .from('auto_dialer_campaigns')
          .update({ 
            [increment]: supabaseClient.rpc('increment', { value: 1 })
          })
          .eq('id', request.campaignId);

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Result recorded'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_status': {
        if (!user) throw new Error('Authentication required');
        
        const { data: campaign, error } = await supabaseClient
          .from('auto_dialer_campaigns')
          .select(`
            *,
            auto_dialer_results(*)
          `)
          .eq('id', request.campaignId)
          .eq('created_by', user.id)
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true,
          campaign
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action');
    }

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