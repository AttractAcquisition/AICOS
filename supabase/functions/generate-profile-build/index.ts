import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, conversion_objective, top_proof_point_ids = [], link_destination } = await req.json();
    if (!client_id) return jsonResponse({ success: false, error: 'client_id is required' }, 400);

    const supabase = createServiceClient();
    const [{ data: contextRow }, { data: proofs }] = await Promise.all([
      supabase.from('client_ai_context').select('*').eq('client_id', client_id).maybeSingle(),
      top_proof_point_ids.length ? supabase.from('proof_assets').select('*').in('id', top_proof_point_ids) : Promise.resolve({ data: [] } as const),
    ]);

    const prompt = `
Generate an Instagram profile build for AA Studio.
Client context:
${JSON.stringify(contextRow?.context_json ?? {}, null, 2)}

Conversion objective: ${conversion_objective ?? 'whatsapp'}
Link destination: ${link_destination ?? ''}
Proof points:
${JSON.stringify(proofs ?? [], null, 2)}

Return JSON only with { bio_copy, bio_cta, highlights_plan, pinned_post_brief, link_in_bio_headline, link_in_bio_button_label, profile_conversion_funnel_map }.
`;

    const build = await anthropicJson(prompt, { maxTokens: 3000, temperature: 0.3, system: 'Return valid JSON only.' });

    const { data: inserted, error } = await supabase.from('profile_builds').insert({
      client_id,
      bio_copy: build.bio_copy,
      bio_cta: build.bio_cta,
      highlights_plan: build.highlights_plan,
      pinned_post_brief: build.pinned_post_brief,
      link_in_bio_headline: build.link_in_bio_headline,
      link_in_bio_button_label: build.link_in_bio_button_label,
      link_in_bio_destination: link_destination ?? null,
      profile_conversion_funnel_map: build.profile_conversion_funnel_map,
      status: 'draft',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;

    return jsonResponse({ success: true, profile_build: inserted });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
