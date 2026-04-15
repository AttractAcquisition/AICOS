import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, cycle_id, campaign_objective, asset_ids = [], placement = 'all', variant_count = 2, budget_context = 'medium' } = await req.json();
    if (!client_id || !campaign_objective) return jsonResponse({ success: false, error: 'client_id and campaign_objective are required' }, 400);

    const supabase = createServiceClient();
    const [{ data: contextRow }, { data: docs }, { data: assets }] = await Promise.all([
      supabase.from('client_ai_context').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('positioning_documents').select('*').eq('client_id', client_id).eq('doc_type', campaign_objective).eq('status', 'approved').order('version', { ascending: false }).limit(1),
      asset_ids.length ? supabase.from('proof_assets').select('*').in('id', asset_ids) : Promise.resolve({ data: [] } as const),
    ]);

    const prompt = `
Generate ${variant_count} ad creative briefs for AA Studio.
Client context:
${JSON.stringify(contextRow?.context_json ?? {}, null, 2)}

Approved positioning document:
${JSON.stringify(docs?.[0] ?? {}, null, 2)}

Proof assets:
${JSON.stringify(assets ?? [], null, 2)}

Objective: ${campaign_objective}
Placement: ${placement}
Budget context: ${budget_context}
Return JSON only with { briefs: [{ headline_variants, primary_text, visual_direction, cta_copy, placement, variant_index, ad_creative_ai_pack_url }] }.
`;

    const result = await anthropicJson<{ briefs: Array<{ headline_variants: any; primary_text: string; visual_direction: string; cta_copy: string; placement: string; variant_index: number; ad_creative_ai_pack_url?: string }> }>(prompt, {
      maxTokens: 3500,
      temperature: 0.35,
      system: 'Return valid JSON only.',
    });

    const inserts = (result.briefs ?? []).map((brief) => ({
      client_id,
      cycle_id: cycle_id ?? null,
      campaign_objective,
      headline_variants: brief.headline_variants,
      primary_text: brief.primary_text,
      visual_direction: brief.visual_direction,
      cta_copy: brief.cta_copy,
      placement: brief.placement,
      variant_index: brief.variant_index,
      ad_creative_ai_pack_url: brief.ad_creative_ai_pack_url ?? null,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: inserted, error } = await supabase.from('ad_creative_briefs').insert(inserts).select('*');
    if (error) throw error;

    return jsonResponse({ success: true, briefs: inserted });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
