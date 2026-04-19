import { createServiceClient, jsonResponse } from './supabase.ts'

export type DeliverableKey =
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8'
  | 'D9' | 'D10' | 'D11' | 'D12' | 'D13' | 'D14' | 'D15'

export const PROOF_SPRINT_TABLES: Record<DeliverableKey, string> = {
  D1: 'proof_sprint_business_intelligence',
  D2: 'proof_sprint_proof_ads',
  D3: 'proof_sprint_ad_variants',
  D4: 'proof_sprint_lead_magnets',
  D5: 'proof_sprint_campaign_specs',
  D6: 'proof_sprint_campaign_specs',
  D7: 'proof_sprint_whatsapp_scripts',
  D8: 'proof_sprint_manychat_flows',
  D9: 'proof_sprint_daily_metrics',
  D10: 'proof_sprint_stabilisation_reports',
  D11: 'proof_sprint_optimisation_reports',
  D12: 'proof_sprint_client_updates',
  D13: 'proof_sprint_acceleration_reports',
  D14: 'proof_sprint_final_data_locks',
  D15: 'proof_sprint_demand_proof_documents',
}

export const AGENTIZED_DELIVERABLES = new Set<DeliverableKey>(['D2', 'D5', 'D6', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'])

export type ProofSprintClientData = Record<string, any> & {
  client_id: string
  business_name?: string
  owner_name?: string
  client_whatsapp?: string
  operator_whatsapp?: string
  c1_campaign_id?: string
  c2_campaign_id?: string
  meta_access_token_ref?: string
  openclaw_agent_id?: string
  sprint_go_live_date?: string | null
  sprint_day_current?: number | null
  input_json?: Record<string, any>
  running_totals_json?: Record<string, any>
}

export type ProofSprintDependencyRow = Record<string, any> & {
  client_id: string
  output_md?: string | null
  output_json?: Record<string, any>
  status?: string | null
}

export type ProofSprintPromptRun = {
  id?: string
  client_id: string
  deliverable_key: string
  prompt_key: string
  prompt_version: string
  upstream_dependencies: string[]
  openclaw_required: boolean
  status: string
  model?: string
  input_json: Record<string, any>
  output_json?: Record<string, any>
  output_md?: string
  output_tables: string[]
  agent_job_id?: string | null
  blocked_by?: string[]
  error_message?: string | null
}

export type ProofSprintPromptTemplate = {
  id: string
  prompt_key: string
  version: string
  title: string
  deliverable_key: string
  system_prompt: string
  user_prompt_template?: string | null
  upstream_dependencies: string[]
  output_tables: string[]
  openclaw_required: boolean
  cron_day?: number | null
  cron_time_sast?: string | null
  active: boolean
  notes?: string | null
}

export function createProofSprintClient() {
  return createServiceClient()
}

export async function loadLatestClientData(clientId: string): Promise<ProofSprintClientData | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('proof_sprint_client_data')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as ProofSprintClientData | null
}

export async function loadLatestRow(table: string, clientId: string, deliverableKey?: string) {
  const supabase = createServiceClient()
  let query = supabase.from(table).select('*').eq('client_id', clientId)
  if (deliverableKey) query = query.eq('deliverable_key', deliverableKey)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (error) throw error
  return data as Record<string, any> | null
}

export async function loadPromptTemplate(promptKey: string, version = '2.0') {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('proof_sprint_prompt_templates')
    .select('*')
    .eq('prompt_key', promptKey)
    .eq('version', version)
    .eq('active', true)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as ProofSprintPromptTemplate | null
}

function resolveTemplateValue(source: any, path: string) {
  const parts = path.split('.')
  let current = source
  for (const part of parts) {
    if (current == null) return undefined
    current = current[part]
  }
  return current
}

export function renderPromptTemplate(template: string, context: Record<string, any>) {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g, (match, token) => {
    const value = resolveTemplateValue(context, token)
    if (value === undefined || value === null) return match
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return JSON.stringify(value, null, 2)
  })
}

export async function loadTableRows(table: string, clientId: string, options: { sprintDay?: number; upToDay?: number } = {}) {
  const supabase = createServiceClient()
  let query = supabase.from(table).select('*').eq('client_id', clientId)
  if (typeof options.sprintDay === 'number') query = query.eq('sprint_day', options.sprintDay)
  if (typeof options.upToDay === 'number') query = query.lte('sprint_day', options.upToDay)
  const { data, error } = await query.order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Record<string, any>[]
}

export async function saveOutputRow(table: string, payload: Record<string, any>) {
  const supabase = createServiceClient()
  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
    created_at: payload.created_at ?? new Date().toISOString(),
  }

  const { data, error } = await supabase.from(table).upsert(row, {
    onConflict: 'client_id,deliverable_key,version',
  }).select('*').maybeSingle()

  if (error) throw error
  return data
}

export function buildIdempotencyKey(clientId: string, deliverableKey: DeliverableKey, suffix: string) {
  return `${clientId}_${deliverableKey}_${suffix}`
}

export async function openaiMarkdown(systemPrompt: string, userPrompt: string, model = 'gpt-5.4-mini') {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_output_tokens: 5000,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI request failed: ${text}`)
  }

  const data = await response.json()
  return String(data.output_text || data.output?.[0]?.content?.[0]?.text || '').trim()
}

export async function sendTelegramMessage(chatId: string, text: string, botToken?: string | null) {
  const token = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('OPENCLAW_TELEGRAM_BOT_TOKEN')
  if (!token) {
    return { ok: false, skipped: true, reason: 'TELEGRAM_BOT_TOKEN not configured' }
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(json)}`)
  }

  return json
}

export async function queueAgentJob(params: {
  clientId: string
  deliverableKey: DeliverableKey
  promptKey: string
  promptVersion: string
  inputArtifactPaths?: string[]
  requiredApps?: string[]
  expectedOutputType?: string
  callbackTarget?: string
  idempotencyKey: string
  payloadJson: Record<string, any>
  openclawAgentId?: string | null
  telegramChatId?: string | null
  telegramBotToken?: string | null
}) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('proof_sprints_agent_jobs').upsert({
    client_id: params.clientId,
    deliverable_key: params.deliverableKey,
    prompt_key: params.promptKey,
    prompt_version: params.promptVersion,
    idempotency_key: params.idempotencyKey,
    required_apps: params.requiredApps ?? [],
    input_artifact_paths: params.inputArtifactPaths ?? [],
    callback_target: params.callbackTarget ?? null,
    expected_output_type: params.expectedOutputType ?? 'json',
    openclaw_agent_id: params.openclawAgentId ?? null,
    telegram_chat_id: params.telegramChatId ?? null,
    payload_json: params.payloadJson,
    status: 'queued',
    retry_allowed: true,
    max_retries: 3,
  }, {
    onConflict: 'idempotency_key',
  }).select('*').single()

  if (error) throw error

  if (params.telegramChatId) {
    try {
      const telegramReceipt = await sendTelegramMessage(
        params.telegramChatId,
        `<b>OpenClaw job</b>\nDeliverable: ${params.deliverableKey}\nPrompt: ${params.promptKey}\nJob: ${data.id}`,
        params.telegramBotToken ?? null,
      )
      await supabase.from('proof_sprints_agent_jobs').update({
        telegram_message_id: String(telegramReceipt?.result?.message_id ?? ''),
        receipt_json: telegramReceipt,
      }).eq('id', data.id)
    } catch (error) {
      await supabase.from('proof_sprints_agent_jobs').update({
        last_error: error instanceof Error ? error.message : String(error),
        status: 'queued',
      }).eq('id', data.id)
    }
  }

  return data
}

export async function logPromptRun(entry: ProofSprintPromptRun) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('proof_sprints_prompt_runs').insert(entry).select('*').single()
  if (error) throw error
  return data
}

export async function markPromptRun(id: string, patch: Record<string, any>) {
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('proof_sprints_prompt_runs').update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export function toMarkdownObject(title: string, sections: Array<{ heading: string; content: string }>) {
  return [
    `# ${title}`,
    ...sections.map(section => `\n## ${section.heading}\n${section.content}`),
  ].join('\n')
}

export function blockedResponse(deliverableKey: DeliverableKey, blockedBy: string[]) {
  return jsonResponse({
    success: false,
    status: 'blocked',
    deliverable_key: deliverableKey,
    reason: 'upstream_incomplete',
    blocked_by: blockedBy,
  }, 409)
}
