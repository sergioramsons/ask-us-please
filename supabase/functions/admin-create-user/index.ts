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
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user making the request
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin privileges (super_admin or org/admin roles)
    let isAuthorized = false;

    // 1) Organization admins or super admins via organization_admins
    const { data: orgAdminRow, error: orgAdminError } = await supabaseAdmin
      .from('organization_admins')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin'])
      .maybeSingle();

    if (orgAdminRow?.role === 'super_admin' || orgAdminRow?.role === 'admin') {
      isAuthorized = true;
    }

    // 2) Org-level admin roles
    if (!isAuthorized) {
      const { data: roles, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'account_admin']);

      if (!roleError && roles && roles.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, displayName, departmentId, role } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the user with admin privileges
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        display_name: displayName
      },
      email_confirm: true
    });

    // Resolve target user (newly created or existing)
    let targetUser: any = authData?.user ?? null;

    if (createError) {
      const msg = (createError.message || '').toLowerCase();
      // If user already exists, fetch it and continue to update profile/roles
      if (msg.includes('already') && (msg.includes('registered') || msg.includes('exists'))) {
        const { data: usersPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) {
          return new Response(
            JSON.stringify({ error: `User exists but could not be listed: ${listErr.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const existing = usersPage?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!existing) {
          return new Response(
            JSON.stringify({ error: 'User already exists but could not be found by email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        targetUser = existing;
      } else {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'Unable to resolve target user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure profile exists and apply updates
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', targetUser.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: targetUser.id,
          display_name: displayName || null,
          department_id: departmentId === 'none' ? null : (departmentId || null)
        });
      if (insertProfileError) {
        console.error('Error inserting profile:', insertProfileError);
      }
    } else if (displayName || departmentId) {
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          display_name: displayName || null,
          department_id: departmentId === 'none' ? null : (departmentId || null)
        })
        .eq('user_id', targetUser.id);
      if (updateProfileError) {
        console.error('Error updating profile:', updateProfileError);
      }
    }

    // Ensure default 'agent' role exists
    const { data: hasAgent } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUser.id)
      .eq('role', 'agent')
      .maybeSingle();

    if (!hasAgent) {
      const { error: addAgentError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: targetUser.id, role: 'agent' });
      if (addAgentError) {
        console.error('Error assigning default agent role:', addAgentError);
      }
    }

    // Assign requested role if provided and not 'agent'
    if (role && role !== 'agent') {
      const { data: hasRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUser.id)
        .eq('role', role)
        .maybeSingle();

      if (!hasRole) {
        const { error: addRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUser.id, role });
        if (addRoleError) {
          console.error('Error assigning role:', addRoleError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: targetUser }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});