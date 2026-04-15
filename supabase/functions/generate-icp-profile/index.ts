import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, demographics, voice_descriptors, sector, location, avg_job_value_zar } = await req.json();
    if (!client_id) return jsonResponse({ success: false, error: 'client_id is required' }, 400);

    const prompt = `
Generate a detailed ICP psychological profile for a ${sector} business in ${location} serving ${JSON.stringify(demographics)} at ${avg_job_value_zar} job values.
Brand voice descriptors: ${JSON.stringify(voice_descriptors)}.
Return JSON only with { fears, desires, decision_triggers, objections, buying_psychology_summary }.
`;

    const icp = await anthropicJson(prompt, {
      maxTokens: 2000,
      temperature: 0.25,
      system: 'Return valid JSON only.',
    });

    const supabase = createServiceClient();
    const { error } = await supabase.from('brand_intelligence').upsert({
      client_id,
      icp_psychology: icp,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' });

    if (error) throw error;

    return jsonResponse({ success: true, icp });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
