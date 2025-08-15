import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      // Get users with admin or agent roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner(
            user_id,
            display_name
          )
        `)
        .in('role', ['admin', 'moderator']);

      if (rolesError) throw rolesError;

      // Get user emails from auth.users (we need to get profiles that have emails)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userRoles?.map(ur => ur.user_id) || []);

      if (profilesError) throw profilesError;

      // For demonstration, we'll use user_id as email since we can't access auth.users directly
      const users = userRoles?.map(userRole => ({
        id: userRole.user_id,
        name: userRole.profiles?.display_name || 'Unknown User',
        email: `${userRole.user_id}@company.com`, // In production, you'd get this from auth metadata
      })) || [];

      return new Response(JSON.stringify({
        users: users
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      error: "method_not_allowed"
    }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in yeastar-users:", error);
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