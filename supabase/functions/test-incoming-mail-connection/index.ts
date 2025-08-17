import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encryption parameters must match the app's client-side implementation
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const DEV_KEY_MATERIAL = 'helpdesk-dev-encryption-key-2024-secure';
const DEV_SALT = 'helpdesk-dev-salt-2024';

async function getEncryptionKey(): Promise<CryptoKey> {
  const envKey = Deno.env.get('ENCRYPTION_KEY') || DEV_KEY_MATERIAL;
  const keyMaterial = new TextEncoder().encode(envKey);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(DEV_SALT),
      iterations: 600000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  );
}

async function decryptEncPassword(encrypted: string): Promise<string> {
  const clean = encrypted.startsWith('enc:') ? encrypted.slice(4) : encrypted;
  const bytes = new Uint8Array(atob(clean).split('').map((c) => c.charCodeAt(0)));
  if (bytes.length < 13) throw new Error('Invalid encrypted data');
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const key = await getEncryptionKey();
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

async function readLine(conn: Deno.Conn, timeoutMs = 8000): Promise<string> {
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(2048);
  return await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Read timeout')), timeoutMs);
    conn.read(buffer).then((n) => {
      clearTimeout(timer);
      if (n === null || n <= 0) return reject(new Error('No data received'));
      resolve(decoder.decode(buffer.subarray(0, n)));
    }).catch((e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function writeLine(conn: Deno.Conn, line: string): Promise<void> {
  const encoder = new TextEncoder();
  const data = encoder.encode(line.endsWith("\r\n") ? line : line + "\r\n");
  await conn.write(data);
}

async function testPOP3(host: string, port: number, username: string, password: string, tls: boolean) {
  const conn = tls
    ? await Deno.connectTls({ hostname: host, port })
    : await Deno.connect({ hostname: host, port });
  try {
    const greet = await readLine(conn);
    if (!greet.includes('+OK')) throw new Error(`POP3 greeting not OK: ${greet.trim()}`);

    await writeLine(conn, `USER ${username}`);
    const userResp = await readLine(conn);
    if (!userResp.includes('+OK')) throw new Error(`POP3 USER failed: ${userResp.trim()}`);

    await writeLine(conn, `PASS ${password}`);
    const passResp = await readLine(conn);
    if (!passResp.includes('+OK')) throw new Error(`POP3 PASS failed: ${passResp.trim()}`);

    await writeLine(conn, 'QUIT');
  } finally {
    try { conn.close(); } catch (_) {}
  }
}

async function testIMAP(host: string, port: number, username: string, password: string, tls: boolean) {
  const conn = tls
    ? await Deno.connectTls({ hostname: host, port })
    : await Deno.connect({ hostname: host, port });
  try {
    const greet = await readLine(conn);
    if (!greet.includes('* OK')) throw new Error(`IMAP greeting not OK: ${greet.trim()}`);

    // Tag commands with A1/A2 for simplicity
    await writeLine(conn, `A1 LOGIN "${username}" "${password}"`);
    const loginResp = await readLine(conn);
    if (!(loginResp.includes('A1 OK') || loginResp.toUpperCase().includes('OK'))) {
      throw new Error(`IMAP LOGIN failed: ${loginResp.trim()}`);
    }

    await writeLine(conn, 'A2 LOGOUT');
  } finally {
    try { conn.close(); } catch (_) {}
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { server_id: serverId } = await req.json();
    if (!serverId) {
      return new Response(
        JSON.stringify({ success: false, message: "Server ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch incoming server configuration
    const { data: server, error: fetchError } = await supabase
      .from('incoming_mail_servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (fetchError || !server) {
      return new Response(
        JSON.stringify({ success: false, message: "Incoming server configuration not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('Testing incoming mail connection for server:', {
      name: server.name,
      type: server.server_type,
      host: server.host,
      port: server.port,
      username: server.username,
      use_ssl: server.use_ssl,
      use_tls: server.use_tls,
    });

    // Decrypt password if it is encrypted by the app
    let password = server.password as string;
    if (password && password.startsWith('enc:')) {
      try {
        password = await decryptEncPassword(password);
        console.log('Password decrypted successfully');
      } catch (e) {
        console.error('Password decryption failed:', e);
        return new Response(
          JSON.stringify({ success: false, message: 'Password decryption failed' }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Determine TLS usage
    const implicitTlsPorts = [995, 993];
    const tls = Boolean(server.use_ssl || server.use_tls || implicitTlsPorts.includes(server.port));

    let success = false;
    let message = '';

    try {
      if (server.server_type === 'pop3') {
        await testPOP3(server.host, server.port, server.username, password, tls);
        message = 'POP3 connection successful';
      } else {
        await testIMAP(server.host, server.port, server.username, password, tls);
        message = 'IMAP connection successful';
      }
      success = true;
    } catch (err: any) {
      message = err?.message || 'Connection failed';
    }

    // Update last_check timestamp
    await supabase
      .from('incoming_mail_servers')
      .update({ last_check: new Date().toISOString() })
      .eq('id', serverId);

    return new Response(
      JSON.stringify({ success, message, timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error testing incoming mail connection:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Failed to test connection' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
