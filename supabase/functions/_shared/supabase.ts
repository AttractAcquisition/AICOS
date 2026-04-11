import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function createUserClient(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
}

export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}

export async function requireRole(req: Request, allowedRoles: string[]) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { error: jsonResponse({ success: false, error: 'Missing Authorization header' }, 401) }
  }

  const token = authHeader.replace(/^Bearer\s+/i, '')
  const payloadPart = token.split('.')[1]
  if (!payloadPart) {
    return { error: jsonResponse({ success: false, error: 'Invalid or expired token' }, 401) }
  }

  const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  let user: Record<string, any>
  try {
    user = JSON.parse(atob(padded))
  } catch {
    return { error: jsonResponse({ success: false, error: 'Invalid or expired token' }, 401) }
  }

  const role = String(user.user_metadata?.role || user.app_metadata?.role || 'client')
  if (!allowedRoles.includes(role)) {
    return {
      error: jsonResponse(
        { success: false, error: `Access denied — role '${role}' is not permitted` },
        403,
      ),
    }
  }

  return { user, role, authHeader }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
