import { jsonResponse, requireRole } from '../_shared/supabase.ts'
import { PROOF_SPRINT_TABLES, createProofSprintClient, loadLatestRow, type DeliverableKey } from '../_shared/proof-sprint.ts'

type Body = {
  job_id?: string
  client_id?: string
  deliverable_key?: DeliverableKey
  version?: number
  status?: string
  output_md?: string
  output_json?: Record<string, any>
  artifact_paths?: string[]
  receipt_json?: Record<string, any>
  error_message?: string | null
  sprint_day?: number | null
}

function isDeliverableKey(value: string): value is DeliverableKey {
  return ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15'].includes(value)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return jsonResponse({ ok: true })

  try {
    const gate = await requireRole(req, ['admin', 'delivery'])
    if ('error' in gate) return gate.error

    const body = (await req.json()) as Body
    const clientId = String(body.client_id || '').trim()
    const deliverableKey = String(body.deliverable_key || '').trim()
    if (!clientId || !deliverableKey || !isDeliverableKey(deliverableKey)) {
      return jsonResponse({ success: false, error: 'client_id and valid deliverable_key are required' }, 400)
    }

    const table = PROOF_SPRINT_TABLES[deliverableKey]
    const supabase = createProofSprintClient()
    const latest = await loadLatestRow(table, clientId, deliverableKey)
    const version = Number(body.version ?? latest?.version ?? 1)
    const status = String(body.status || 'completed')

    const rowPayload = {
      client_id: clientId,
      deliverable_key: deliverableKey,
      version,
      prompt_key: latest?.prompt_key ?? null,
      model: latest?.model ?? null,
      input_json: latest?.input_json ?? {},
      output_json: body.output_json ?? latest?.output_json ?? {},
      output_md: body.output_md ?? latest?.output_md ?? null,
      artifact_paths: body.artifact_paths ?? latest?.artifact_paths ?? [],
      status,
      run_id: latest?.run_id ?? body.job_id ?? null,
      error_message: body.error_message ?? null,
      updated_at: new Date().toISOString(),
      created_at: latest?.created_at ?? new Date().toISOString(),
    }

    const { data: saved, error: upsertError } = await supabase.from(table).upsert(rowPayload, {
      onConflict: 'client_id,deliverable_key,version',
    }).select('*').single()
    if (upsertError) throw upsertError

    if (body.job_id) {
      await supabase.from('proof_sprints_agent_jobs').update({
        status,
        receipt_json: body.receipt_json ?? {},
        last_error: body.error_message ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', body.job_id)

      if (body.artifact_paths?.length) {
        const artifacts = body.artifact_paths.map((path, index) => ({
          job_id: body.job_id,
          client_id: clientId,
          deliverable_key: deliverableKey,
          bucket: 'proof_sprints_content',
          object_path: path,
          public_url: path,
          artifact_kind: 'agent_return',
          metadata_json: { index },
          status: 'created',
        }))
        await supabase.from('proof_sprints_agent_artifacts').insert(artifacts)
      }

      await supabase.from('proof_sprints_external_receipts').insert({
        client_id: clientId,
        deliverable_key: deliverableKey,
        provider: 'openclaw',
        receipt_json: body.receipt_json ?? {},
        status,
      })
    }

    if (deliverableKey === 'D14') {
      await supabase.from('proof_sprint_client_data').update({ d14_locked: true, updated_at: new Date().toISOString() }).eq('client_id', clientId)
    }

    return jsonResponse({ success: true, deliverable_key: deliverableKey, row: saved })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
