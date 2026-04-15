import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, cycle_id, funnel_layer, content_format, asset_ids = [], week_number } = await req.json();
    if (!client_id || !funnel_layer || !content_format) return jsonResponse({ success: false, error: 'client_id, funnel_layer, and content_format are required' }, 400);

    const supabase = createServiceClient();
    const [{ data: contextRow }, { data: docs }, { data: scripts }, { data: assets }] = await Promise.all([
      supabase.from('client_ai_context').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('positioning_documents').select('*').eq('client_id', client_id).eq('doc_type', funnel_layer).eq('status', 'approved').order('version', { ascending: false }).limit(1),
      supabase.from('scripts').select('*').eq('client_id', client_id).eq('objective', funnel_layer).eq('status', 'active').order('psychological_alignment_score', { ascending: false }).limit(3),
      asset_ids.length ? supabase.from('proof_assets').select('*').in('id', asset_ids) : Promise.resolve({ data: [] } as const),
    ]);

    const prompt = `
Generate an organic content draft for AA Studio.
Client context:
${JSON.stringify(contextRow?.context_json ?? {}, null, 2)}

Positioning document:
${JSON.stringify(docs?.[0] ?? {}, null, 2)}

Top scripts:
${JSON.stringify(scripts ?? [], null, 2)}

Proof assets:
${JSON.stringify(assets ?? [], null, 2)}

Funnel layer: ${funnel_layer}
Content format: ${content_format}
Week number: ${week_number ?? 1}
Return JSON only with { caption, hook_variants, body_copy, cta_text, hashtag_set, reel_script, carousel_slides, brand_voice_score }.
`;

    const result = await anthropicJson(prompt, { maxTokens: 3500, temperature: 0.35, system: 'Return valid JSON only.' });

    const { data: inserted, error } = await supabase.from('organic_posts').insert({
      client_id,
      cycle_id: cycle_id ?? null,
      funnel_layer,
      content_format,
      caption: result.caption,
      hook_variants: result.hook_variants,
      body_copy: result.body_copy,
      cta_text: result.cta_text,
      hashtag_set: result.hashtag_set,
      reel_script: result.reel_script,
      carousel_slides: result.carousel_slides,
      asset_ids,
      brand_voice_score: result.brand_voice_score,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw error;

    return jsonResponse({ success: true, post: inserted });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
