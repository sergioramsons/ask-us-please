import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve caller org id
    let userOrgId: string | null = null;
    const { data: currentUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    userOrgId = currentUserProfile?.organization_id ?? null;
    if (!userOrgId) {
      const { data: roleOrg } = await supabaseAdmin
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .not('organization_id', 'is', null)
        .maybeSingle();
      userOrgId = roleOrg?.organization_id ?? null;
    }

    // Check permissions (org admin)
    let isAuthorized = false;
    const { data: orgAdminRow } = await supabaseAdmin
      .from('organization_admins')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin'])
      .maybeSingle();
    if (orgAdminRow?.role === 'super_admin' || orgAdminRow?.role === 'admin') isAuthorized = true;

    if (!isAuthorized) {
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'account_admin']);
      if (roles && roles.length > 0) isAuthorized = true;
    }

    if (!isAuthorized || !userOrgId) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { userId, email, displayName, departmentId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update profile using service role
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: email ?? null,
        display_name: displayName ?? null,
        department_id: departmentId === 'none' ? null : (departmentId ?? null),
        organization_id: userOrgId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('admin-update-user-profile error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Return the updated profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, display_name, department_id')
      .eq('user_id', userId)
      .maybeSingle();

    return new Response(JSON.stringify({ success: true, profile }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('admin-update-user-profile exception:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});