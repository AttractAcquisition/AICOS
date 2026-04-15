import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, doc_type, primary_objection, proof_point_ids = [] } = await req.json();
    if (!client_id || !doc_type) return jsonResponse({ success: false, error: 'client_id and doc_type are required' }, 400);

    const supabase = createServiceClient();
    const [{ data: contextRow, error: contextError }, { data: proofRows, error: proofError }, { data: docs, error: docsError }] = await Promise.all([
      supabase.from('client_ai_context').select('*').eq('client_id', client_id).maybeSingle(),
      proof_point_ids.length
        ? supabase.from('proof_assets').select('*').in('id', proof_point_ids)
        : Promise.resolve({ data: [], error: null } as const),
      supabase.from('positioning_documents').select('version,status').eq('client_id', client_id).eq('doc_type', doc_type).order('version', { ascending: false }),
    ]);

    if (contextError) throw contextError;
    if (proofError) throw proofError;
    if (docsError) throw docsError;

    const context = contextRow?.context_json ?? {};
    const proofs = proofRows ?? [];
    const nextVersion = ((docs?.[0]?.version ?? 0) as number) + 1;

    const prompt = `
Create a ${doc_type} positioning document for AA Studio.
Client context:
${JSON.stringify(context, null, 2)}

Selected proof assets:
${JSON.stringify(proofs, null, 2)}

Primary objection:
${primary_objection ?? 'none provided'}

Return JSON only with:
{
  "narrative_arc": string,
  "psychological_triggers": {"cold": string[], "warm": string[], "hot": string[]},
  "proof_point_ranking": string[],
  "content_themes": string[],
  "key_messages": string[],
  "objection_stack": string[]
}
`;

    const content = await anthropicJson(prompt, {
      maxTokens: 3000,
      temperature: 0.35,
      system: 'Return valid JSON only.',
    });

    const { data: inserted, error } = await supabase.from('positioning_documents').insert({
      client_id,
      doc_type,
      version: nextVersion,
      status: 'draft',
      content,
      narrative_arc: content.narrative_arc,
      psychological_triggers: content.psychological_triggers,
      objection_stack: content.objection_stack ?? [],
      proof_point_ranking: content.proof_point_ranking ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('*').single();

    if (error) throw error;

    return jsonResponse({ success: true, document: inserted });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
