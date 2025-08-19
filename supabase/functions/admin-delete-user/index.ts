import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
  hardDelete?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Auth header required
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller
    const { data: { user: caller }, error: authErr } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, hardDelete = true } = await req.json() as DeleteUserRequest;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine caller's org (for authorization)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', caller.id)
      .maybeSingle();

    const callerOrgId = callerProfile?.organization_id ?? null;

    // Check admin permissions: organization_admins, or user_roles admin/account_admin
    let isAuthorized = false;
    const { data: orgAdmin } = await supabaseAdmin
      .from('organization_admins')
      .select('role')
      .eq('user_id', caller.id)
      .in('role', ['super_admin', 'admin'])
      .maybeSingle();
    if (orgAdmin?.role === 'super_admin' || orgAdmin?.role === 'admin') {
      isAuthorized = true;
    }

    if (!isAuthorized && callerOrgId) {
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
        .eq('organization_id', callerOrgId)
        .in('role', ['admin', 'account_admin']);
      if (roles && roles.length > 0) isAuthorized = true;
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up relational data first (non-blocking on error)
    const errors: string[] = [];

    const { error: rolesDelErr } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (rolesDelErr) errors.push(`roles: ${rolesDelErr.message}`);

    const { error: profileDelErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (profileDelErr) errors.push(`profile: ${profileDelErr.message}`);

    // Optionally detach this user from tickets/comments to avoid FK issues
    // Best-effort, ignore errors
    await supabaseAdmin
      .from('tickets')
      .update({ assigned_to: null })
      .eq('assigned_to', userId);
    await supabaseAdmin
      .from('tickets')
      .update({ created_by: null })
      .eq('created_by', userId);
    await supabaseAdmin
      .from('ticket_comments')
      .update({ user_id: null })
      .eq('user_id', userId);

    // Delete auth user via admin API (requires service role)
    let authDeleted = false;
    if (hardDelete) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) {
        errors.push(`auth: ${authError.message}`);
      } else {
        authDeleted = true;
      }
    }

    const result = { success: true, authDeleted, errors };
    return new Response(JSON.stringify(result), {
      status: errors.length ? 207 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('admin-delete-user error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
