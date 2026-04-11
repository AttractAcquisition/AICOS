import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts'

function toApifyStatus(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'completed') return 'SUCCEEDED'
  if (normalized === 'failed') return 'FAILED'
  if (normalized === 'paused') return 'ABORTED'
  if (normalized === 'queued' || normalized === 'active') return 'RUNNING'
  return 'SUCCEEDED'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true })
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  const gate = await requireRole(req, ['admin', 'distribution'])
  if ('error' in gate) return gate.error

  try {
    const body = await req.json()
    const runId = String(body?.run_id || '').trim()
    if (!runId) {
      return jsonResponse({ success: false, error: 'run_id is required' }, 400)
    }

    const service = createServiceClient()
    const { data, error } = await service
      .from('integration_events')
      .select('status,payload,error_message,created_at,updated_at')
      .eq('integration_name', 'apify-scraper')
      .contains('payload', { run_id: runId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return jsonResponse({ success: false, error: 'Run not found', status: 'FAILED', prospects: [] }, 404)
    }

    const prospects = Array.isArray((data.payload as any)?.prospects) ? (data.payload as any).prospects : []
    return jsonResponse({
      success: true,
      status: toApifyStatus(data.status),
      prospects,
      count: prospects.length,
      error: data.error_message || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[apify-results]', message)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
