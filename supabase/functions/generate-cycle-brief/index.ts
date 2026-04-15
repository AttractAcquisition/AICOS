import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts';
import { anthropicJson } from '../_shared/anthropic.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true });
  const auth = await requireRole(req, ['admin', 'delivery']);
  if ('error' in auth) return auth.error;

  try {
    const { client_id, completed_cycle_id } = await req.json();
    if (!client_id || !completed_cycle_id) return jsonResponse({ success: false, error: 'client_id and completed_cycle_id are required' }, 400);

    const supabase = createServiceClient();
    const [{ data: cycle }, { data: entries }, { data: approvals }] = await Promise.all([
      supabase.from('cycles').select('*').eq('id', completed_cycle_id).maybeSingle(),
      supabase.from('content_calendar_entries').select('*').eq('cycle_id', completed_cycle_id),
      supabase.from('approval_queue').select('*').eq('cycle_id', completed_cycle_id),
    ]);

    const prompt = `
Review the completed delivery cycle for AA Studio.
Cycle:
${JSON.stringify(cycle ?? {}, null, 2)}

Entries:
${JSON.stringify(entries ?? [], null, 2)}

Approvals:
${JSON.stringify(approvals ?? [], null, 2)}

Return JSON only with { completion_summary, content_gaps, recommended_focus_adjustments, next_cycle_content_brief }.
`;

    const report = await anthropicJson(prompt, { maxTokens: 2500, temperature: 0.3, system: 'Return valid JSON only.' });

    await supabase.from('cycles').update({ completion_report: report, status: 'complete' }).eq('id', completed_cycle_id);

    const nextCycleNumber = (cycle?.cycle_number ?? 0) + 1;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow); end.setDate(end.getDate() + 13);

    const { data: nextCycle } = await supabase.from('cycles').insert({
      client_id,
      cycle_number: nextCycleNumber,
      start_date: tomorrow.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      status: 'active',
    }).select('*').single();

    return jsonResponse({ success: true, report, next_cycle: nextCycle });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
