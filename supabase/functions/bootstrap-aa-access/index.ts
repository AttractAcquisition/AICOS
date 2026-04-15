import { createServiceClient, jsonResponse } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405);

  try {
    const bootstrapKey = Deno.env.get('AA_BOOTSTRAP_KEY');
    const body = await req.json().catch(() => ({}));
    if (!bootstrapKey || body.bootstrap_key !== bootstrapKey) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const adminEmail = String(body.admin_email || 'aa-admin@attractacq.com').trim().toLowerCase();
    const adminPassword = String(body.admin_password || 'AaStudio!2026');
    const adminFullName = String(body.admin_full_name || 'AA Admin');
    const aaBusinessName = String(body.business_name || 'Attract Acquisition');
    const aaOwnerName = String(body.owner_name || 'Alex Thomas');
    const aaTier = String(body.tier || 'Proof Brand');

    const supabase = createServiceClient();
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return jsonResponse({ success: false, error: listError.message }, 400);

    let adminUserId: string | null = null;
    const existingAdmin = existingUsers.users.find((u) => u.email?.toLowerCase() === adminEmail);
    if (existingAdmin) {
      adminUserId = existingAdmin.id;
      const { error: updateUserError } = await supabase.auth.admin.updateUserById(adminUserId, {
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: 'admin', full_name: adminFullName },
      });
      if (updateUserError) return jsonResponse({ success: false, error: updateUserError.message }, 400);
    } else {
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: 'admin', full_name: adminFullName },
      });
      if (createUserError || !newUser.user) return jsonResponse({ success: false, error: createUserError?.message || 'Failed to create admin user' }, 400);
      adminUserId = newUser.user.id;
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: adminUserId,
      full_name: adminFullName,
      role: 'admin',
      client_id: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (profileError) return jsonResponse({ success: false, error: profileError.message }, 400);

    const { data: existingClient, error: clientLookupError } = await supabase.from('clients').select('id').eq('business_name', aaBusinessName).maybeSingle();
    if (clientLookupError) return jsonResponse({ success: false, error: clientLookupError.message }, 400);

    let aaClientId = existingClient?.id ?? null;
    const clientPayload = {
      business_name: aaBusinessName,
      owner_name: aaOwnerName,
      email: adminEmail,
      status: 'active',
      tier: aaTier,
      monthly_ad_spend: 0,
      monthly_retainer: 0,
      account_manager: adminUserId,
      account_manager_name: 'Attract Acquisition',
      contract_start_date: new Date().toISOString().slice(0, 10),
      setup_fee: 0,
    };

    if (aaClientId) {
      const { error: updateClientError } = await supabase.from('clients').update(clientPayload).eq('id', aaClientId);
      if (updateClientError) return jsonResponse({ success: false, error: updateClientError.message }, 400);
    } else {
      aaClientId = crypto.randomUUID();
      const { error: insertClientError } = await supabase.from('clients').insert({ id: aaClientId, ...clientPayload });
      if (insertClientError) return jsonResponse({ success: false, error: insertClientError.message }, 400);
    }

    const { error: profileClientError } = await supabase.from('profiles').update({ client_id: aaClientId }).eq('id', adminUserId);
    if (profileClientError) return jsonResponse({ success: false, error: profileClientError.message }, 400);

    return jsonResponse({
      success: true,
      admin_user_id: adminUserId,
      admin_email: adminEmail,
      admin_password: adminPassword,
      aa_client_id: aaClientId,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
