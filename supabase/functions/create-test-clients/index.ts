import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts'

const DEFAULT_CLIENTS = [
  {
    email: 'client3@attractacq.com',
    password: 'Client3@Acq',
    full_name: 'Client Three',
    business_name: 'Client 3 Test',
    owner_name: 'Client Three',
    tier: 'Proof Sprint',
    monthly_ad_spend: 5000,
    monthly_retainer: 8000,
  },
  {
    email: 'client4@attractacq.com',
    password: 'Client4@Acq',
    full_name: 'Client Four',
    business_name: 'Client 4 Test',
    owner_name: 'Client Four',
    tier: 'Proof Brand',
    monthly_ad_spend: 10000,
    monthly_retainer: 10000,
  },
  {
    email: 'client5@attractacq.com',
    password: 'Client5@Acq',
    full_name: 'Client Five',
    business_name: 'Client 5 Test',
    owner_name: 'Client Five',
    tier: 'Authority Brand',
    monthly_ad_spend: 15000,
    monthly_retainer: 17000,
  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  const auth = await requireRole(req, ['admin'])
  if ('error' in auth) return auth.error

  const supabase = createServiceClient()
  const body = await req.json().catch(() => ({}))
  const clients = Array.isArray(body.clients) && body.clients.length > 0 ? body.clients : DEFAULT_CLIENTS
  const created: any[] = []

  for (const spec of clients) {
    const email = String(spec.email || '').trim().toLowerCase()
    const password = String(spec.password || '')
    if (!email || !password) {
      return jsonResponse({ success: false, error: 'Each client needs email and password' }, 400)
    }

    const fullName = String(spec.full_name || spec.owner_name || email.split('@')[0])

    let userId: string | null = null
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (listError) return jsonResponse({ success: false, error: listError.message }, 400)

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email)
    if (existingUser) {
      userId = existingUser.id
      const { error: updateUserError } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { role: 'client', full_name: fullName },
      })
      if (updateUserError) return jsonResponse({ success: false, error: updateUserError.message }, 400)
    } else {
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'client', full_name: fullName },
      })
      if (createUserError || !newUser.user) return jsonResponse({ success: false, error: createUserError?.message || 'Failed to create user' }, 400)
      userId = newUser.user.id
    }

    const clientId = crypto.randomUUID()
    const basePayload = {
      business_name: String(spec.business_name || fullName),
      owner_name: String(spec.owner_name || fullName),
      email,
      status: 'active',
      tier: String(spec.tier || 'Proof Sprint'),
      monthly_ad_spend: Number(spec.monthly_ad_spend || 0),
      monthly_retainer: Number(spec.monthly_retainer || 0),
      account_manager: auth.user?.id || null,
      account_manager_name: 'Attract Acquisition',
      contract_start_date: new Date().toISOString().split('T')[0],
      setup_fee: 0,
    }

    const { data: existingClient, error: clientLookupError } = await supabase.from('clients').select('id').eq('email', email).maybeSingle()
    if (clientLookupError) return jsonResponse({ success: false, error: clientLookupError.message }, 400)

    if (existingClient?.id) {
      const { error: updateClientError } = await supabase.from('clients').update(basePayload).eq('id', existingClient.id)
      if (updateClientError) return jsonResponse({ success: false, error: updateClientError.message }, 400)
      const { error: profileError } = await supabase.from('profiles').update({ client_id: existingClient.id }).eq('id', userId)
      if (profileError) return jsonResponse({ success: false, error: profileError.message }, 400)
      created.push({ email, user_id: userId, client_id: existingClient.id, updated: true })
    } else {
      const { error: insertClientError } = await supabase.from('clients').insert({ id: clientId, ...basePayload })
      if (insertClientError) return jsonResponse({ success: false, error: insertClientError.message }, 400)
      const { error: profileError } = await supabase.from('profiles').update({ client_id: clientId }).eq('id', userId)
      if (profileError) return jsonResponse({ success: false, error: profileError.message }, 400)
      created.push({ email, user_id: userId, client_id: clientId, created: true })
    }
  }

  return jsonResponse({ success: true, created })
})
