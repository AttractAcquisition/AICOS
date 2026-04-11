import { requireRole, jsonResponse } from '../_shared/supabase.ts'

interface SprintReportBody {
  sprint?: Record<string, unknown>
  logs?: Record<string, unknown>[]
}

function summarizeLogs(logs: Record<string, unknown>[]) {
  return logs.slice(0, 40).map((log) => {
    const day = String(log.date_key || log.date || log.day || 'unknown day')
    const spend = log.spend ?? log.ad_spend ?? log.amount ?? 0
    const leads = log.leads ?? log.leads_generated ?? 0
    const notes = log.notes || log.summary || ''
    return `- ${day}: spend ${spend}, leads ${leads}${notes ? `, ${notes}` : ''}`
  }).join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  try {
    const gate = await requireRole(req, ['admin', 'delivery'])
    if ('error' in gate) return gate.error

    const body = (await req.json()) as SprintReportBody
    const sprint = body.sprint || {}
    const logs = Array.isArray(body.logs) ? body.logs : []

    const clientName = String(sprint.client_name || sprint.client || 'Client')
    const status = String(sprint.status || 'unknown')
    const spend = Number(sprint.actual_ad_spend || sprint.total_spend || sprint.ad_spend || 0)
    const leads = Number(sprint.leads_generated || 0)
    const cpl = leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0
    const logSummary = summarizeLogs(logs)

    const report = [
      `${clientName} sprint results`,
      `Status: ${status}`,
      `Spend: ${spend}`,
      `Leads generated: ${leads}`,
      `CPL: ${cpl || '—'}`,
      '',
      'Performance highlights',
      leads > 0 ? `- The sprint produced ${leads} lead(s) on ${logs.length} logged day(s).` : '- No leads were recorded in the sprint logs.',
      spend > 0 ? `- Total spend tracked at ${spend}.` : '- Ad spend was not recorded.',
      '',
      'Performance gaps',
      logs.length === 0 ? '- No daily logs were provided.' : '- Review daily spend vs lead output for drop-off days.',
      '',
      'What this means for the client',
      '- The numbers should be framed against the next sprint capacity and the results meeting narrative.',
      '',
      'Next sprint priorities',
      '- Tighten the messaging around the highest-converting angle.',
      '- Reduce friction in the first response path.',
      '- Keep the proof loop visible inside the client conversation.',
      '',
      'Daily log summary',
      logSummary || '- No logs supplied.',
    ].join('\n')

    return jsonResponse({ success: true, report })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[generate-sprint-report]', message)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
