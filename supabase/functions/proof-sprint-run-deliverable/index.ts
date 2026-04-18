import { jsonResponse, requireRole } from '../_shared/supabase.ts'
import {
  AGENTIZED_DELIVERABLES,
  buildIdempotencyKey,
  blockedResponse,
  createProofSprintClient,
  loadLatestClientData,
  loadLatestRow,
  loadTableRows,
  logPromptRun,
  openaiMarkdown,
  queueAgentJob,
  saveOutputRow,
  type DeliverableKey,
  type ProofSprintClientData,
} from '../_shared/proof-sprint.ts'

type Body = {
  client_id?: string
  deliverable_key?: DeliverableKey
  run_id?: string
  model?: string
  force_agent?: boolean
  input_json?: Record<string, any>
}

function isDeliverableKey(value: string): value is DeliverableKey {
  return ['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15'].includes(value)
}

function mdFromObject(title: string, value: any) {
  const lines: string[] = [`# ${title}`]
  const walk = (key: string, val: any, depth = 2) => {
    const prefix = '#'.repeat(Math.min(depth, 6))
    if (Array.isArray(val)) {
      lines.push(`\n${prefix} ${key}`)
      for (const item of val) {
        if (item && typeof item === 'object') {
          lines.push(`- ${JSON.stringify(item)}`)
        } else {
          lines.push(`- ${String(item)}`)
        }
      }
      return
    }
    if (val && typeof val === 'object') {
      lines.push(`\n${prefix} ${key}`)
      for (const [childKey, childVal] of Object.entries(val)) walk(childKey, childVal, depth + 1)
      return
    }
    lines.push(`\n${prefix} ${key}`)
    lines.push(String(val ?? ''))
  }
  for (const [k, v] of Object.entries(value ?? {})) walk(k, v)
  return lines.join('\n')
}

function dependenciesFor(deliverableKey: DeliverableKey) {
  switch (deliverableKey) {
    case 'D1': return []
    case 'D2': return ['D1']
    case 'D3': return ['D1']
    case 'D4': return ['D1']
    case 'D5': return ['D1', 'D2', 'D3']
    case 'D6': return ['D1', 'D4', 'D5']
    case 'D7': return ['D1', 'D5']
    case 'D8': return ['D5', 'D7']
    case 'D9': return ['D5', 'D6']
    case 'D10': return ['D9']
    case 'D11': return ['D9', 'D10']
    case 'D12': return ['D9']
    case 'D13': return ['D9', 'D11']
    case 'D14': return ['D9', 'D11']
    case 'D15': return ['D14']
  }
}

function configFor(deliverableKey: DeliverableKey) {
  const base = {
    model: 'gpt-5.4-mini',
    outputTable: 'proof_sprint_business_intelligence',
    promptKey: 'p01_bi_positioning',
    openclawRequired: false,
    title: 'Proof Sprint Deliverable',
  }

  switch (deliverableKey) {
    case 'D1':
      return { ...base, outputTable: 'proof_sprint_business_intelligence', promptKey: 'p01_bi_positioning', title: 'Business Intelligence & Positioning', openclawRequired: false }
    case 'D2':
      return { ...base, outputTable: 'proof_sprint_proof_ads', promptKey: 'p02_frame3_copy', title: 'AA Studio Proof Ads', openclawRequired: true }
    case 'D3':
      return { ...base, outputTable: 'proof_sprint_ad_variants', promptKey: 'p03_ad_variants', title: 'AdCreative.ai Variant Suite', openclawRequired: true }
    case 'D4':
      return { ...base, outputTable: 'proof_sprint_lead_magnets', promptKey: 'p04_lead_magnet', title: 'Lead Magnet Asset', openclawRequired: false }
    case 'D5':
      return { ...base, outputTable: 'proof_sprint_campaign_specs', promptKey: 'p05_meta_conversion', title: 'Meta Conversion Campaign', openclawRequired: true }
    case 'D6':
      return { ...base, outputTable: 'proof_sprint_campaign_specs', promptKey: 'p06_meta_leads', title: 'Meta Leads Campaign', openclawRequired: true }
    case 'D7':
      return { ...base, outputTable: 'proof_sprint_whatsapp_scripts', promptKey: 'p07_whatsapp_qualifier', title: 'WhatsApp DM Qualifier Script', openclawRequired: false }
    case 'D8':
      return { ...base, outputTable: 'proof_sprint_manychat_flows', promptKey: 'p08_manychat_flow', title: 'WhatsApp Conversion Flow', openclawRequired: true }
    case 'D9':
      return { ...base, outputTable: 'proof_sprint_daily_metrics', promptKey: 'p09_daily_metrics', title: 'Daily Sprint Metrics Engine', openclawRequired: true }
    case 'D10':
      return { ...base, outputTable: 'proof_sprint_stabilisation_reports', promptKey: 'p10_stabilisation', title: 'Day 3 Stabilisation Protocol', openclawRequired: true }
    case 'D11':
      return { ...base, outputTable: 'proof_sprint_optimisation_reports', promptKey: 'p11_optimisation_day4', title: 'Day 4 Optimisation Report', openclawRequired: true }
    case 'D12':
      return { ...base, outputTable: 'proof_sprint_client_updates', promptKey: 'p12_client_update_day7', title: 'Day 7 Mid-Sprint Client Update', openclawRequired: true }
    case 'D13':
      return { ...base, outputTable: 'proof_sprint_acceleration_reports', promptKey: 'p13_acceleration_day8', title: 'Day 8 Acceleration Phase', openclawRequired: true }
    case 'D14':
      return { ...base, outputTable: 'proof_sprint_final_data_locks', promptKey: 'p14_final_data_lock', title: 'Day 13 Final Data Lock', openclawRequired: false }
    case 'D15':
      return { ...base, outputTable: 'proof_sprint_demand_proof_documents', promptKey: 'p15_demand_proof', title: 'Demand Proof Document', openclawRequired: true }
  }
}

function buildSystemPrompt(deliverableKey: DeliverableKey, client: ProofSprintClientData, deps: Record<string, any>, input: Record<string, any>) {
  switch (deliverableKey) {
    case 'D1':
      return `You are a senior brand strategist. Return JSON only with transformation_type, buying_trigger, customer_intents, dominant_competitor_angle, positioning_gap, positioning_formula, icp_summary, top_objection for ${client.business_name}.`
    case 'D2':
      return `You are a direct-response copywriter. Return JSON only with 3 before/after proof ad frame-3 variants for ${client.business_name}. Include headline, subtext, cta, and campaign assignment. Use the locked positioning data from D1.`
    case 'D3':
      return `You are a performance ad copywriter. Return JSON only with pain, outcome, and offer copy sets for ${client.business_name}. Include campaign assignments and variant ids.`
    case 'D4':
      return `You are a content strategist. Return JSON only with lead magnet format, title, points, CTA, and Meta form spec for ${client.business_name}.`
    case 'D5':
      return `You are a Meta targeting strategist. Return JSON only with a Campaign 1 WhatsApp structure, ad sets, keyword trigger, and auto-first response for ${client.business_name}.`
    case 'D6':
      return `You are a Meta targeting strategist. Return JSON only with a Campaign 2 Leads structure, ad sets, budget split, and instant form logic for ${client.business_name}.`
    case 'D7':
      return `You are a conversion copywriter. Return JSON only with the WhatsApp DM qualifier script for ${client.business_name}.`
    case 'D8':
      return `You are an automation architect. Return JSON only with the ManyChat branching flow for ${client.business_name}.`
    case 'D9':
      return `You are the AA Campaign Monitor. Create a daily metrics job payload for ${client.business_name}. Use the Meta campaign ids in the client data and return JSON only with status, sprint_day, and the agent activation payload.`
    case 'D10':
      return `You are the AA Sprint Manager. Return JSON only with a Day 3 stabilisation report for ${client.business_name} using the metrics data provided.`
    case 'D11':
      return `You are the AA Campaign Optimiser. Return JSON only with a Day 4 optimisation report and action list for ${client.business_name}.`
    case 'D12':
      return `You are the AA Account Manager. Return JSON only with a Day 7 client update sequence and internal summary for ${client.business_name}.`
    case 'D13':
      return `You are the AA Campaign Optimiser. Return JSON only with a Day 8 acceleration report for ${client.business_name}.`
    case 'D14':
      return `You are the AA Data Analyst. Return JSON only with a locked 14-day dataset summary for ${client.business_name}.`
    case 'D15':
      return `You are the AA Lead Strategist. Return JSON only with the demand proof document for ${client.business_name}.`
  }
}

function buildUserPrompt(deliverableKey: DeliverableKey, client: ProofSprintClientData, deps: Record<string, any>, input: Record<string, any>) {
  return JSON.stringify({
    client_data: client,
    input_json: input,
    dependencies: deps,
    deliverable_key: deliverableKey,
  }, null, 2)
}

async function parseOrWrapMarkdown(title: string, raw: string) {
  try {
    const parsed = JSON.parse(raw)
    return { output_json: parsed, output_md: mdFromObject(title, parsed) }
  } catch {
    return { output_json: { text: raw }, output_md: `# ${title}\n\n${raw}` }
  }
}

async function savePromptRunBase(entry: {
  client_id: string
  deliverable_key: DeliverableKey
  prompt_key: string
  prompt_version: string
  upstream_dependencies: string[]
  openclaw_required: boolean
  status: string
  model: string
  input_json: Record<string, any>
  output_tables: string[]
  blocked_by?: string[]
  error_message?: string | null
}) {
  return logPromptRun({
    client_id: entry.client_id,
    deliverable_key: entry.deliverable_key,
    prompt_key: entry.prompt_key,
    prompt_version: entry.prompt_version,
    upstream_dependencies: entry.upstream_dependencies,
    openclaw_required: entry.openclaw_required,
    status: entry.status,
    model: entry.model,
    input_json: entry.input_json,
    output_tables: entry.output_tables,
    blocked_by: entry.blocked_by ?? [],
    error_message: entry.error_message ?? null,
  })
}

async function gatherDependencies(clientId: string, deliverableKey: DeliverableKey) {
  const deps = dependenciesFor(deliverableKey)
  const rows: Record<string, any> = {}
  for (const dep of deps) {
    rows[dep] = await loadLatestRow(PROOF_SPRINT_TABLES[dep], clientId)
  }
  return rows
}

function isComplete(row: Record<string, any> | null | undefined) {
  return Boolean(row && String(row.status ?? '').toLowerCase() === 'completed')
}

function hasBlockingDependencies(deliverableKey: DeliverableKey, deps: Record<string, any>) {
  const blocked = dependenciesFor(deliverableKey).filter(dep => !isComplete(deps[dep]))
  return blocked
}

export async function runProofSprintDeliverable(clientId: string, deliverableKey: DeliverableKey, options: { runId?: string; model?: string; forceAgent?: boolean; inputJson?: Record<string, any> } = {}) {
  let client = await loadLatestClientData(clientId)
  if (!client) {
    return jsonResponse({ success: false, error: 'Client sprint state not found' }, 404)
  }

  if (options.inputJson && Object.keys(options.inputJson).length) {
    const supabase = createProofSprintClient()
    const nextState = {
      client_id: clientId,
      deliverable_key: deliverableKey,
      input_json: options.inputJson,
      updated_at: new Date().toISOString(),
    }

    await supabase.from('proof_sprint_client_data').upsert(nextState, {
      onConflict: 'client_id,deliverable_key',
    })

    client = await loadLatestClientData(clientId)
  }

  const deps = await gatherDependencies(clientId, deliverableKey)
  const blocked = hasBlockingDependencies(deliverableKey, deps)
  if (blocked.length) return blockedResponse(deliverableKey, blocked)

  const cfg = configFor(deliverableKey)
  const promptVersion = '2.0'
  const input = { ...client.input_json, client_data: client }
  const promptRun = await savePromptRunBase({
    client_id: clientId,
    deliverable_key: deliverableKey,
    prompt_key: cfg.promptKey,
    prompt_version: promptVersion,
    upstream_dependencies: dependenciesFor(deliverableKey),
    openclaw_required: cfg.openclawRequired,
    status: 'running',
    model: options.model ?? cfg.model,
    input_json: { client, deps, run_id: options.runId ?? null },
    output_tables: [cfg.outputTable],
  })

  try {
    if (deliverableKey === 'D9') {
      const sprintDay = Number(client.sprint_day_current || 1)
      const output = {
        client_id: clientId,
        sprint_day: sprintDay,
        log_date: new Date().toISOString().slice(0, 10),
        stabilisation_phase: sprintDay <= 3,
        status: 'queued',
        raw_api_response: { note: 'OpenClaw metrics job queued', client_id: clientId, deliverable_key: deliverableKey },
      }
      const supabase = createProofSprintClient()
      await supabase.from('proof_sprint_daily_metrics').upsert({
        client_id: clientId,
        sprint_day: sprintDay,
        log_date: new Date().toISOString().slice(0, 10),
        c1_spend: 0,
        c1_cpm: 0,
        c1_ctr: 0,
        c1_cost_per_message: 0,
        c1_dms_started: 0,
        c2_spend: 0,
        c2_cpm: 0,
        c2_ctr: 0,
        c2_cost_per_lead: 0,
        c2_leads_generated: 0,
        blended_total_spend: 0,
        blended_cost_per_result: 0,
        kill_alerts_json: [],
        scale_alerts_json: [],
        stabilisation_phase: sprintDay <= 3,
        raw_api_response: { note: 'OpenClaw metrics job queued', client_id: clientId, deliverable_key: deliverableKey },
        status: 'queued',
        created_by: null,
      }, { onConflict: 'client_id,sprint_day,log_date' })
      const job = await queueAgentJob({
        clientId,
        deliverableKey,
        promptKey: cfg.promptKey,
        promptVersion,
        idempotencyKey: buildIdempotencyKey(clientId, deliverableKey, String(sprintDay)),
        requiredApps: ['meta_graph_api', 'openclaw'],
        inputArtifactPaths: [],
        expectedOutputType: 'json',
        callbackTarget: `supabase://proof_sprint_daily_metrics/client/${clientId}/day/${sprintDay}`,
        payloadJson: { client, deps, sprint_day: sprintDay },
        openclawAgentId: client.openclaw_agent_id ?? null,
        telegramChatId: Deno.env.get('OPENCLAW_TELEGRAM_CHAT_ID') || Deno.env.get('TELEGRAM_CHAT_ID') || undefined,
      })
      await markPromptRun(promptRun.id!, {
        status: 'completed',
        output_json: output,
        output_md: mdFromObject(cfg.title, output),
        agent_job_id: job.id,
      })
      return jsonResponse({ success: true, deliverable_key: deliverableKey, output, agent_job: job, status: 'queued' })
    }

    const systemPrompt = buildSystemPrompt(deliverableKey, client, deps, input)
    const userPrompt = buildUserPrompt(deliverableKey, client, deps, input)
    const raw = await openaiMarkdown(systemPrompt, userPrompt, options.model ?? cfg.model)
    const parsed = await parseOrWrapMarkdown(cfg.title, raw)
    const version = 1 + Number((await loadLatestRow(cfg.outputTable, clientId, deliverableKey))?.version ?? 0)

    const saved = await saveOutputRow(cfg.outputTable, {
      client_id: clientId,
      deliverable_key: deliverableKey,
      version,
      prompt_key: cfg.promptKey,
      model: options.model ?? cfg.model,
      input_json: input,
      output_json: parsed.output_json,
      output_md: parsed.output_md,
      status: 'completed',
      run_id: options.runId ?? null,
      created_by: null,
    })

    let agentJob: Record<string, any> | null = null
    if (cfg.openclawRequired || options.forceAgent) {
      agentJob = await queueAgentJob({
        clientId,
        deliverableKey,
        promptKey: cfg.promptKey,
        promptVersion,
        idempotencyKey: buildIdempotencyKey(clientId, deliverableKey, String(version)),
        requiredApps: deliverableKey === 'D2'
          ? ['adcreative_ai']
          : deliverableKey === 'D5' || deliverableKey === 'D6'
            ? ['meta_graph_api']
            : deliverableKey === 'D8'
              ? ['manychat']
              : deliverableKey === 'D12' || deliverableKey === 'D15'
                ? ['whatsapp_business_api']
                : deliverableKey === 'D9'
                  ? ['meta_graph_api', 'cron_scheduler']
                  : deliverableKey === 'D10' || deliverableKey === 'D11' || deliverableKey === 'D13' || deliverableKey === 'D14'
                    ? ['meta_graph_api']
                    : [],
        inputArtifactPaths: [],
        expectedOutputType: 'receipt',
        callbackTarget: `supabase://${cfg.outputTable}/client/${clientId}`,
        payloadJson: { client, deps, output: parsed.output_json, output_md: parsed.output_md },
        openclawAgentId: client.openclaw_agent_id ?? null,
        telegramChatId: Deno.env.get('OPENCLAW_TELEGRAM_CHAT_ID') || Deno.env.get('TELEGRAM_CHAT_ID') || undefined,
      })
    }

    await markPromptRun(promptRun.id!, {
      status: 'completed',
      output_json: parsed.output_json,
      output_md: parsed.output_md,
      agent_job_id: agentJob?.id ?? null,
    })

    return jsonResponse({ success: true, deliverable_key: deliverableKey, row: saved, agent_job: agentJob })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await markPromptRun(promptRun.id!, {
      status: 'failed',
      error_message: message,
    })
    return jsonResponse({ success: false, error: message }, 500)
  }
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

    return await runProofSprintDeliverable(clientId, deliverableKey, {
      runId: body.run_id,
      model: body.model,
      forceAgent: body.force_agent,
      inputJson: body.input_json,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return jsonResponse({ success: false, error: message }, 500)
  }
})
