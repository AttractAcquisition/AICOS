import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, content_type, content_id } = await req.json();
    if (!client_id || !content_type || !content_id) return jsonResponse({ success: false, error: 'client_id, content_type, and content_id are required' }, 400);

    const supabase = createServiceClient();
    const [contextRow, contentRow, queueRows] = await Promise.all([
      supabase.from('client_ai_context').select('*').eq('client_id', client_id).maybeSingle(),
      content_type === 'organic_post'
        ? supabase.from('organic_posts').select('*').eq('id', content_id).maybeSingle()
        : content_type === 'ad_brief'
          ? supabase.from('ad_creative_briefs').select('*').eq('id', content_id).maybeSingle()
          : content_type === 'profile_build'
            ? supabase.from('profile_builds').select('*').eq('id', content_id).maybeSingle()
            : supabase.from('positioning_documents').select('*').eq('id', content_id).maybeSingle(),
      supabase.from('approval_queue').select('*').eq('client_id', client_id).eq('content_type', content_type).eq('content_id', content_id).order('created_at', { ascending: false }).limit(1),
    ]);

    const prompt = `
Review the following ${content_type} for AA Studio.
Client context:
${JSON.stringify(contextRow.data?.context_json ?? {}, null, 2)}

Content:
${JSON.stringify(contentRow.data ?? {}, null, 2)}

Return JSON only with { brand_voice_score, cta_present, funnel_alignment_check, funnel_alignment_reason, approval_readiness_score, revision_suggestion }.
`;

    const result = await anthropicJson(prompt, { maxTokens: 1200, temperature: 0.2, system: 'Return valid JSON only.' });
    const queueId = queueRows.data?.[0]?.id;
    if (queueId) {
      await supabase.from('approval_queue').update({
        brand_voice_score: result.brand_voice_score,
        cta_present: result.cta_present,
        funnel_alignment_check: result.funnel_alignment_check,
        approval_readiness_score: result.approval_readiness_score,
        revision_notes: result.revision_suggestion ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', queueId);
    }

    return jsonResponse({ success: true, ...result });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
