import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import { createServiceClient, jsonResponse, requireRole } from '../_shared/supabase.ts'
import { PROOF_SPRINT_TABLES, createProofSprintClient, loadLatestClientData, loadLatestRow, type DeliverableKey } from '../_shared/proof-sprint.ts'

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

async function buildPdf(title: string, sections: Array<{ heading: string; content: string }>) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let page = pdf.addPage([595, 842])
  let y = 800

  page.drawText(title, { x: 40, y, size: 18, font: bold, color: rgb(0.08, 0.1, 0.11) })
  y -= 28

  for (const section of sections) {
    page.drawText(section.heading, { x: 40, y, size: 11, font: bold, color: rgb(0.0, 0.75, 0.64) })
    y -= 16
    for (const line of section.content.split('\n')) {
      const chunks = line.match(/.{1,100}/g) || ['']
      for (const chunk of chunks) {
        page.drawText(chunk, { x: 40, y, size: 9.5, font, color: rgb(0.18, 0.18, 0.2) })
        y -= 13
        if (y < 72) {
          y = 800
          page = pdf.addPage([595, 842])
        }
      }
    }
    y -= 8
  }

  return pdf.save()
}

async function uploadCloseoutPdf(clientId: string, outputMd: string | null | undefined, outputJson: Record<string, any>) {
  const supabase = createServiceClient()
  const pdfBytes = await buildPdf('Proof Sprint Demand Proof Closeout', [
    { heading: 'Summary', content: outputMd || JSON.stringify(outputJson, null, 2) },
  ])
  const path = `${clientId}/closeout-${Date.now()}.pdf`
  const { error } = await supabase.storage.from('proof_sprints_content').upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('proof_sprints_content').getPublicUrl(path)
  return { path, url: data.publicUrl }
}

async function sendWhatsappMessage(to: string | null | undefined, text: string) {
  if (!to) return { skipped: true, reason: 'missing_recipient' }

  const token = Deno.env.get('WHATSAPP_BUSINESS_TOKEN') || Deno.env.get('META_WHATSAPP_TOKEN') || Deno.env.get('WHATSAPP_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID')
  if (!token || !phoneNumberId) {
    return { skipped: true, reason: 'missing_whatsapp_credentials', to, text }
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body: text.slice(0, 1500) },
    }),
  })

  const receipt = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`WhatsApp send failed: ${JSON.stringify(receipt)}`)
  return receipt
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
    const clientData = await loadLatestClientData(clientId)
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

    let whatsappReceipt: Record<string, any> | null = null
    if (deliverableKey === 'D12' || deliverableKey === 'D15') {
      const recipient = String(body.output_json?.client_whatsapp || clientData?.client_whatsapp || clientData?.input_json?.d1?.clientWhatsapp || '').trim() || null
      const messageText = deliverableKey === 'D12'
        ? String(body.output_json?.message || body.output_md || 'Proof Sprint update ready.')
        : String(body.output_json?.delivery_message || body.output_md || 'Demand proof closeout ready.')
      try {
        const receipt = await sendWhatsappMessage(recipient, messageText)
        whatsappReceipt = receipt as Record<string, any>
      } catch (error) {
        whatsappReceipt = { error: error instanceof Error ? error.message : String(error), recipient, messageText }
      }

      await supabase.from('proof_sprints_delivery_runs').insert({
        client_id: clientId,
        deliverable_key: deliverableKey,
        channel: 'whatsapp',
        recipient,
        message_json: { text: messageText, output_json: body.output_json ?? {}, output_md: body.output_md ?? null },
        receipt_json: whatsappReceipt ?? {},
        status,
      })
    }

    if (deliverableKey === 'D14') {
      await supabase.from('proof_sprint_client_data').update({ d14_locked: true, updated_at: new Date().toISOString() }).eq('client_id', clientId)
    }

    if (deliverableKey === 'D15' && status === 'completed') {
      const closeout = await uploadCloseoutPdf(clientId, body.output_md, body.output_json ?? {})
      await supabase.from('proof_sprint_closeouts').upsert({
        client_id: clientId,
        deliverable_key: 'D15',
        demand_determination: String(body.output_json?.demand_determination || body.output_json?.demandResult || 'inconclusive').toLowerCase(),
        deposit_credit_confirmed: Boolean(body.output_json?.creditApproved),
        proof_brand_proceed: Boolean(body.output_json?.engagementClosed),
        delivery_receipt_wa: String(whatsappReceipt?.messages?.[0]?.id || whatsappReceipt?.result?.message_id || closeout.url),
        delivery_receipt_portal: String(body.output_json?.portal_link || clientData?.input_json?.d15?.portalLink || ''),
        closed_at: new Date().toISOString(),
        closed_by: 'openclaw-agent-callback',
        status: 'completed',
        input_json: clientData?.input_json ?? latest?.input_json ?? {},
        output_json: body.output_json ?? {},
        artifact_paths: [closeout.path],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id,deliverable_key' })
    }

    return jsonResponse({ success: true, deliverable_key: deliverableKey, row: saved })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
