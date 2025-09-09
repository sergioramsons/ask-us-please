import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { WelcomeEmail } from './_templates/welcome-email.tsx';

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

    // Get the user's organization for assigning to new users
    const { data: currentUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let userOrgId = currentUserProfile?.organization_id;

    // Fallback resolve organization from user_roles if profile has no org
    if (!userOrgId) {
      const { data: roleOrg } = await supabaseAdmin
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .not('organization_id', 'is', null)
        .maybeSingle();
      userOrgId = roleOrg?.organization_id ?? null;
    }

    // Check if user has admin privileges (super_admin or org/admin roles)
    let isAuthorized = false;
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
          email: email,
          display_name: displayName || null,
          department_id: departmentId === 'none' ? null : (departmentId || null),
          organization_id: userOrgId
        });
      if (insertProfileError) {
        console.error('Error inserting profile:', insertProfileError);
      }
    } else {
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: email,
          display_name: displayName || null,
          department_id: departmentId === 'none' ? null : (departmentId || null),
          organization_id: userOrgId
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
      .eq('organization_id', userOrgId)
      .maybeSingle();

    if (!hasAgent) {
      const { error: addAgentError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: targetUser.id, role: 'agent', organization_id: userOrgId });
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
        .eq('organization_id', userOrgId)
        .maybeSingle();

      if (!hasRole) {
        const { error: addRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUser.id, role, organization_id: userOrgId });
        if (addRoleError) {
          console.error('Error assigning role:', addRoleError);
        }
      }
    }

    // Send welcome email
    try {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      
      // Get organization details for the email
      const { data: organization } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', userOrgId)
        .maybeSingle();

      const organizationName = organization?.name || 'Your Organization';
      
      // Generate login URL (using the Supabase URL as base)
      const loginUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/auth/v1', '')}/auth`;
      
      // Render the email template
      const emailHtml = await renderAsync(
        React.createElement(WelcomeEmail, {
          userName: displayName || email.split('@')[0],
          userEmail: email,
          temporaryPassword: password,
          loginUrl: loginUrl,
          organizationName: organizationName,
        })
      );

      // Send the email
      const emailResponse = await resend.emails.send({
        from: `${organizationName} <onboarding@resend.dev>`,
        to: [email],
        subject: `Welcome to ${organizationName} - Your account is ready`,
        html: emailHtml,
      });

      console.log('Welcome email sent successfully:', emailResponse);
    } catch (emailError: any) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the user creation if email fails
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