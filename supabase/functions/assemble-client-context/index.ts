import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id } = await req.json();
    if (!client_id) return jsonResponse({ success: false, error: 'client_id is required' }, 400);

    const supabase = createServiceClient();

    const [brandRes, docsRes, proofRes] = await Promise.all([
      supabase.from('brand_intelligence').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('positioning_documents').select('*').eq('client_id', client_id).eq('status', 'approved').order('version', { ascending: false }),
      supabase.from('proof_assets').select('*').eq('client_id', client_id).order('proof_score', { ascending: false }).limit(5),
    ]);

    if (brandRes.error) throw brandRes.error;
    if (docsRes.error) throw docsRes.error;
    if (proofRes.error) throw proofRes.error;

    const brand = brandRes.data;
    const docs = docsRes.data ?? [];
    const proofs = proofRes.data ?? [];

    const prompt = `
You are synthesizing a client AI context JSON object for AA Studio.
Use the provided brand intelligence, approved positioning summaries, and proof assets.
Return JSON only with this shape:
{
  "business_name": string,
  "sector": string,
  "trade_type": string,
  "location": string,
  "service_radius_km": number,
  "icp": {"demographics": object, "psychology": {"fears": string[], "desires": string[], "decision_triggers": string[], "objections": string[]}},
  "avg_job_value_zar": number,
  "conversion_objective": string,
  "brand_voice": {"descriptors": string[], "tone_rules": string, "language_examples": string[]},
  "differentiation": string,
  "top_proof_points": string[],
  "positioning_summaries": {"attraction": string, "nurture": string, "conversion": string}
}

Brand intelligence:
${JSON.stringify(brand ?? {}, null, 2)}

Approved positioning docs:
${JSON.stringify(docs, null, 2)}

Top proof assets:
${JSON.stringify(proofs, null, 2)}
`;

    const context = await anthropicJson(prompt, {
      maxTokens: 3000,
      temperature: 0.2,
      system: 'You are a precise brand strategist. Return valid JSON only.',
    });

    const { data: saved, error } = await supabase.from('client_ai_context').upsert({
      client_id,
      context_json: context,
      context_version: (brand?.version ?? 1),
      last_assembled_at: new Date().toISOString(),
    }, { onConflict: 'client_id' }).select('context_version').single();

    if (error) throw error;

    return jsonResponse({ success: true, context_version: saved?.context_version ?? 1, context });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
