import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicImageJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, asset_id, file_url, asset_tag, job_type } = await req.json();
    if (!client_id || !asset_id || !file_url) return jsonResponse({ success: false, error: 'client_id, asset_id, and file_url are required' }, 400);

    const res = await fetch(file_url);
    if (!res.ok) throw new Error(`Failed to fetch proof asset: ${res.status}`);
    const mediaType = res.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await res.arrayBuffer());
    const base64 = btoa(String.fromCharCode(...bytes));

    const prompt = `
You are evaluating a proof asset for AA Studio.
Client ID: ${client_id}
Asset tag: ${asset_tag}
Job type: ${job_type ?? 'unknown'}
Return JSON only with: { proof_score: number, caption: string, alt_text: string, content_use_suggestion: string }.
Score social proof strength 0-10.
`;

    const result = await anthropicImageJson<{ proof_score: number; caption: string; alt_text: string; content_use_suggestion: string }>(prompt, base64, mediaType, {
      maxTokens: 1200,
      temperature: 0.2,
      system: 'Return valid JSON only.',
    });

    const supabase = createServiceClient();
    const { error } = await supabase.from('proof_assets').update({
      proof_score: result.proof_score,
      ai_caption: result.caption,
      alt_text: result.alt_text,
      content_use_suggestion: result.content_use_suggestion,
      approval_status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', asset_id);
    if (error) throw error;

    return jsonResponse({ success: true, ...result });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
