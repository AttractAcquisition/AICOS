import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, objective, content_type, tone_variant, platform, count = 6 } = await req.json();
    if (!client_id || !objective || !content_type) return jsonResponse({ success: false, error: 'client_id, objective, and content_type are required' }, 400);

    const supabase = createServiceClient();
    const [{ data: contextRow }, { data: docs }] = await Promise.all([
      supabase.from('client_ai_context').select('*').eq('client_id', client_id).maybeSingle(),
      supabase.from('positioning_documents').select('*').eq('client_id', client_id).eq('doc_type', objective).eq('status', 'approved').order('version', { ascending: false }).limit(1),
    ]);

    const prompt = `
Generate ${count} ad scripts for a ${objective} campaign.
Client context:
${JSON.stringify(contextRow?.context_json ?? {}, null, 2)}

Approved positioning document:
${JSON.stringify(docs?.[0] ?? {}, null, 2)}

Content type: ${content_type}
Tone variant: ${tone_variant ?? 'proof'}
Platform: ${platform ?? 'all'}

Return JSON only with { scripts: [{ hook_text, body_text, cta_text, psychological_alignment_score }] }.
`;

    const result = await anthropicJson<{ scripts: Array<{ hook_text: string; body_text: string; cta_text: string; psychological_alignment_score: number }> }>(prompt, {
      maxTokens: 3000,
      temperature: 0.35,
      system: 'Return valid JSON only.',
    });

    const scripts = result.scripts?.slice(0, count) ?? [];
    const inserts = scripts.map((script) => ({
      client_id,
      objective,
      content_type,
      tone_variant: tone_variant ?? 'proof',
      hook_text: script.hook_text,
      body_text: script.body_text,
      cta_text: script.cta_text,
      platform: platform ?? 'all',
      psychological_alignment_score: script.psychological_alignment_score,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: inserted, error } = await supabase.from('scripts').insert(inserts).select('*');
    if (error) throw error;

    return jsonResponse({ success: true, scripts: inserted });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
