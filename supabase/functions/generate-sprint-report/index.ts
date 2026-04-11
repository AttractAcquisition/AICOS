import { createUserClient, jsonResponse } from '../_shared/supabase.ts'

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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401)

  const userClient = createUserClient(authHeader)
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return jsonResponse({ success: false, error: 'Invalid or expired token' }, 401)

  const role = String(user.user_metadata?.role || user.app_metadata?.role || 'client')
  if (!['admin', 'delivery'].includes(role)) {
    return jsonResponse({ success: false, error: `Access denied — role '${role}' is not permitted` }, 403)
  }

  try {
    const body = (await req.json()) as SprintReportBody
    const sprint = body.sprint || {}
    const logs = Array.isArray(body.logs) ? body.logs : []

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return jsonResponse({ success: false, error: 'OPENAI_API_KEY is not configured' }, 500)
    }

    const system = `You write crisp sprint results reports for Attract Acquisition. Be specific, numeric, and direct. Return plain text only, no markdown tables.`
    const userPrompt = `Write a client-facing sprint results report using this data:\n\nSprint:\n${JSON.stringify(sprint, null, 2)}\n\nDaily logs:\n${summarizeLogs(logs)}\n\nStructure:\n- 1 sentence summary\n- Performance highlights\n- Performance gaps\n- What this means for the client\n- Next sprint priorities\n- Close with a clear recommendation for the results meeting.`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`)
    }

    const data = await res.json()
    const report = String(data.choices?.[0]?.message?.content || '').trim()
    if (!report) throw new Error('OpenAI returned an empty report')

    return jsonResponse({ success: true, report })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[generate-sprint-report]', message)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
