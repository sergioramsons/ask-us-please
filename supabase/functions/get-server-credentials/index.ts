import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CredentialRequest {
  server_id: string;
  server_type: 'smtp' | 'incoming';
  purpose: string; // e.g., 'send_email', 'fetch_email'
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { server_id, server_type, purpose }: CredentialRequest = await req.json();
    
    console.log(`Getting credentials for ${server_type} server ${server_id} for purpose: ${purpose}`);

    // Verify the request is coming from an authenticated admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some(r => r.role === 'admin')) {
      throw new Error('Insufficient permissions - admin access required');
    }

    let credentials;
    
    if (server_type === 'smtp') {
      // Get SMTP server credentials and decrypt password
      const { data, error } = await supabase
        .rpc('decrypt_server_password', { 
          encrypted_password: '(SELECT smtp_password FROM email_servers WHERE id = $1)' 
        })
        .single();

      if (error) throw error;

      const { data: serverData, error: serverError } = await supabase
        .from('email_servers')
        .select('*')
        .eq('id', server_id)
        .single();

      if (serverError) throw serverError;

      // Decrypt the password securely
      const { data: decryptedPassword, error: decryptError } = await supabase
        .rpc('decrypt_server_password', { encrypted_password: serverData.smtp_password });

      if (decryptError) throw decryptError;

      credentials = {
        host: serverData.smtp_host,
        port: serverData.smtp_port,
        username: serverData.smtp_username,
        password: decryptedPassword,
        secure: serverData.use_tls,
        sender_email: serverData.sender_email,
        sender_name: serverData.sender_name
      };
    } else {
      // Get incoming mail server credentials
      const { data: serverData, error: serverError } = await supabase
        .from('incoming_mail_servers')
        .select('*')
        .eq('id', server_id)
        .single();

      if (serverError) throw serverError;

      // Decrypt the password securely
      const { data: decryptedPassword, error: decryptError } = await supabase
        .rpc('decrypt_server_password', { encrypted_password: serverData.password });

      if (decryptError) throw decryptError;

      credentials = {
        host: serverData.host,
        port: serverData.port,
        username: serverData.username,
        password: decryptedPassword,
        secure: serverData.use_ssl,
        folder: serverData.folder_name
      };
    }

    // Log the access for audit purposes
    console.log(`Credentials accessed by user ${user.id} for ${purpose}`);

    return new Response(JSON.stringify({ credentials }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in get-server-credentials:", error);
    return new Response(JSON.stringify({
      error: "access_denied",
      error_description: error.message
    }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);