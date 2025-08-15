import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    if (req.method === "GET") {
      // Handle contact search by phone
      if (url.searchParams.has('phone')) {
        const phone = url.searchParams.get('phone')!;
        
        const { data: contacts, error } = await supabase
          .from('contacts')
          .select('*')
          .or(`phone.eq.${phone},phone.like.%${phone}%`)
          .limit(100);

        if (error) throw error;

        return new Response(JSON.stringify({
          users: contacts?.map(contact => ({
            id: contact.id,
            name: `${contact.first_name} ${contact.last_name}`.trim(),
            phone: contact.phone,
            email: contact.email,
            notes: contact.notes
          })) || []
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      
      // Handle general contact search
      if (url.searchParams.has('query')) {
        const query = url.searchParams.get('query')!;
        
        const { data: contacts, error } = await supabase
          .from('contacts')
          .select('*')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(100);

        if (error) throw error;

        return new Response(JSON.stringify({
          users: contacts?.map(contact => ({
            id: contact.id,
            name: `${contact.first_name} ${contact.last_name}`.trim(),
            phone: contact.phone,
            email: contact.email,
            notes: contact.notes
          })) || []
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    
    if (req.method === "POST") {
      // Create new contact
      const body = await req.json();
      const userData = body.user;
      
      const nameParts = userData.name?.split(' ') || ['Unknown'];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: lastName,
          phone: userData.phone,
          email: userData.email,
          notes: userData.notes
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        user: {
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`.trim(),
          phone: contact.phone,
          email: contact.email,
          notes: contact.notes
        }
      }), {
        status: 201,
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
    console.error("Error in yeastar-contacts:", error);
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