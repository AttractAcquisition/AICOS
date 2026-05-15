// Model: claude-sonnet-4-6 — sprint closeout reports and next-step recommendations.
import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })
const SONNET    = 'claude-sonnet-4-6'
const SOP_ID    = '26'
const SOP_NAME  = 'SOP 26 — Sprint Closeout'

// ─── Types ────────────────────────────────────────────────────────────────────

// Raw shape returned from proof_sprints
interface SprintRow {
  id:               string
  client_name:      string
  status:           string
  sprint_number:    number | null
  leads_generated:  number | null
  actual_ad_spend:  number | null
  client_ad_budget: number | null
  total_impressions: number | null
  link_clicks:      number | null
  start_date:       string
}

// Normalised shape used throughout the rest of the function
interface NormalisedSprint {
  id:               string
  client_name:      string
  status:           string
  day_number:       number
  leads_generated:  number
  leads_target:     number
  spend:            number
  spend_budget:     number
  cpl:              number
  cpl_target:       number
  roas:             number
  roas_target:      number
  impressions:      number
  clicks:           number
  start_date:       string
  end_date:         string
}

interface AdSetLogRow {
  adset_name:  string
  spend:       number
  impressions: number
  clicks:      number
  cpl:         number
  cpl_target:  number | null
}

interface CloseoutAnalysis {
  totalLeads:        number
  finalCPL:          number
  finalROAS:         number
  cplVsTarget:       string
  roasVsTarget:      string
  budgetUtilisation: string
  leadPaceVsTarget:  string
  ctr:               string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Map a raw proof_sprints row to the normalised shape the rest of the function expects.
// Derives day_number from start_date, computes CPL from spend/leads.
function normalise(raw: SprintRow): NormalisedSprint {
  const leadsGen   = raw.leads_generated   ?? 0
  const spend      = raw.actual_ad_spend   ?? 0
  const budget     = raw.client_ad_budget  ?? 0
  const impressions = raw.total_impressions ?? 0
  const clicks     = raw.link_clicks       ?? 0

  const dayMs  = Date.now() - new Date(raw.start_date).getTime()
  const dayNum = raw.sprint_number ?? Math.max(Math.floor(dayMs / 86_400_000), 1)
  const cpl    = leadsGen > 0 ? spend / leadsGen : 0
  const endDate = new Date(new Date(raw.start_date).getTime() + 14 * 86_400_000)
    .toISOString().slice(0, 10)

  return {
    id:            raw.id,
    client_name:   raw.client_name,
    status:        raw.status,
    day_number:    dayNum,
    leads_generated: leadsGen,
    leads_target:  0,   // not stored on proof_sprints
    spend,
    spend_budget:  budget,
    cpl,
    cpl_target:    0,   // not stored on proof_sprints
    roas:          0,   // not stored on proof_sprints
    roas_target:   0,   // not stored on proof_sprints
    impressions,
    clicks,
    start_date:    raw.start_date,
    end_date:      endDate,
  }
}

function analyse(s: NormalisedSprint): CloseoutAnalysis {
  const cplDelta  = s.cpl_target > 0 ? ((s.cpl / s.cpl_target - 1) * 100) : 0
  const roasDelta = s.roas_target > 0 ? ((s.roas / s.roas_target - 1) * 100) : 0
  const budgetPct = s.spend_budget > 0 ? (s.spend / s.spend_budget) * 100 : 0
  const leadPct   = s.leads_target > 0 ? (s.leads_generated / s.leads_target) * 100 : 0
  const ctr       = s.impressions  > 0 ? (s.clicks / s.impressions) * 100 : 0

  return {
    totalLeads:        s.leads_generated,
    finalCPL:          s.cpl,
    finalROAS:         s.roas,
    cplVsTarget:       `${cplDelta >= 0 ? '+' : ''}${cplDelta.toFixed(1)}%`,
    roasVsTarget:      `${roasDelta >= 0 ? '+' : ''}${roasDelta.toFixed(1)}%`,
    budgetUtilisation: `${budgetPct.toFixed(1)}%`,
    leadPaceVsTarget:  `${leadPct.toFixed(1)}%`,
    ctr:               `${ctr.toFixed(2)}%`,
  }
}

// ─── Claude analysis ──────────────────────────────────────────────────────────

interface CloseoutReport {
  summary:        string
  keyLearnings:   string[]
  recommendation: 'continue_as_proof_brand' | 'repeat_sprint' | 'pause'
  rationale:      string
  nextSteps:      string[]
}

async function generateCloseoutReport(
  sprint:    NormalisedSprint,
  adSetLogs: AdSetLogRow[],
  metrics:   CloseoutAnalysis,
): Promise<CloseoutReport> {
  const adSetSection = adSetLogs.length > 0
    ? adSetLogs.map(a =>
        `  ${a.adset_name}: spend £${a.spend.toFixed(2)}, CPL £${a.cpl.toFixed(2)}` +
        (a.cpl_target ? ` vs £${a.cpl_target} target` : '') +
        `, ${a.impressions} impressions, ${a.clicks} clicks`,
      ).join('\n')
    : '  No ad set breakdown available'

  const context = `SPRINT CLOSEOUT DATA
Client: ${sprint.client_name}
Sprint dates: ${sprint.start_date} → ${sprint.end_date}
Sprint day: ${sprint.day_number} of 14

FINAL METRICS:
  Leads generated: ${metrics.totalLeads}
  CPL: £${metrics.finalCPL.toFixed(2)}
  Spend: £${sprint.spend.toFixed(2)}${sprint.spend_budget > 0 ? ` / £${sprint.spend_budget} budget (${metrics.budgetUtilisation} utilised)` : ''}
  Impressions: ${sprint.impressions.toLocaleString()}
  Clicks: ${sprint.clicks.toLocaleString()}
  CTR: ${metrics.ctr}

AD SET PERFORMANCE:
${adSetSection}`

  const response = await anthropic.messages.create({
    model:      SONNET,
    max_tokens: 1200,
    system: [{ type: 'text', text: [
      'You are an expert performance marketing analyst for Attract Acquisition,',
      'an agency running paid advertising (Meta Ads) for local service businesses.',
      '',
      'Analyse the sprint closeout data and return a JSON object with exactly these keys:',
      '  summary        — string: 2-3 sentence executive summary of the sprint',
      '  keyLearnings   — string[]: 3-5 bullet points of what we learned (campaign, audience, offer insights)',
      '  recommendation — one of: "continue_as_proof_brand" | "repeat_sprint" | "pause"',
      '                   continue_as_proof_brand: strong lead volume, good CPL, client ready to scale',
      '                   repeat_sprint: reasonable CPL, decent lead volume but needs refinement',
      '                   pause: very high CPL or very low lead volume — fundamentals need reviewing',
      '  rationale      — string: 2-3 sentences explaining the recommendation decision',
      '  nextSteps      — string[]: 3-5 specific, actionable next steps for the account manager',
      '',
      'Output ONLY valid JSON — no markdown fences, no explanation.',
    ].join('\n'), cache_control: { type: 'ephemeral' } }],
    messages: [
      {
        role:    'user',
        content: `Analyse this sprint and produce the closeout JSON:\n\n${context}`,
      },
    ],
  })

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()

  return JSON.parse(raw) as CloseoutReport
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // ── 1. Fetch sprints ready for closeout (start_date ≤ 14 days ago) ────────
    const threshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10)

    const { data: rawSprints, error: sprintsErr } = await supabase
      .from('proof_sprints')
      .select([
        'id', 'client_name', 'status', 'sprint_number',
        'leads_generated', 'actual_ad_spend', 'client_ad_budget',
        'total_impressions', 'link_clicks', 'start_date',
      ].join(', '))
      .eq('status', 'active')
      .lte('start_date', threshold)

    if (sprintsErr) throw new Error(`fetch proof_sprints: ${sprintsErr.message}`)

    const sprints = ((rawSprints ?? []) as SprintRow[]).map(normalise)
    console.log(`[sop-26] ${sprints.length} sprints eligible for closeout (started ≤ ${threshold})`)

    if (sprints.length === 0) {
      await supabase.from('ai_task_log').insert({
        sop_id:         SOP_ID,
        sop_name:       SOP_NAME,
        tool_called:    SONNET,
        status:         'success',
        duration_ms:    Date.now() - startedAt,
        input_summary:  `0 sprints started on or before ${threshold}`,
        output_summary: 'No sprints ready for closeout',
      })
      return new Response(
        JSON.stringify({ message: 'No sprints ready for closeout', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── 2. Bulk-fetch ad set performance logs for each sprint ────────────────
    const sprintIds = sprints.map(s => s.id)
    const adLogsBySprint = new Map<string, AdSetLogRow[]>()

    const { data: rawAdLogs, error: adLogsErr } = await supabase
      .from('ad_set_performance_logs')
      .select('sprint_id, adset_name, spend, impressions, clicks, cpl, cpl_target')
      .in('sprint_id', sprintIds)
      .order('spend', { ascending: false })

    if (adLogsErr) {
      console.warn(`[sop-26] ad_set_performance_logs fetch warning: ${adLogsErr.message}`)
    } else {
      for (const log of (rawAdLogs ?? []) as (AdSetLogRow & { sprint_id: string })[]) {
        const arr = adLogsBySprint.get(log.sprint_id) ?? []
        arr.push(log)
        adLogsBySprint.set(log.sprint_id, arr)
      }
    }

    // ── 3. Process each sprint ───────────────────────────────────────────────
    let closedOut        = 0
    let approvalCreated  = 0
    let alertsCreated    = 0
    const approvalIds: string[] = []
    const errors: string[]      = []

    for (const sprint of sprints) {
      try {
        console.log(`[sop-26] closing out sprint for ${sprint.client_name} (day ${sprint.day_number})`)

        const adSetLogs = adLogsBySprint.get(sprint.id) ?? []
        const metrics   = analyse(sprint)

        // ── 3a. Generate AI analysis ─────────────────────────────────────────
        const report = await generateCloseoutReport(sprint, adSetLogs, metrics)
        console.log(`[sop-26] ${sprint.client_name} → recommendation: ${report.recommendation}`)

        // ── 3b. Mark sprint as complete ──────────────────────────────────────
        const { error: updateErr } = await supabase
          .from('proof_sprints')
          .update({ status: 'complete' })
          .eq('id', sprint.id)

        if (updateErr) {
          console.error(`[sop-26] proof_sprints update failed for ${sprint.id}: ${updateErr.message}`)
          errors.push(`sprint update ${sprint.id}: ${updateErr.message}`)
          continue
        }

        closedOut++

        // ── 3c. Create approval_queue item ───────────────────────────────────
        const today       = new Date().toISOString().slice(0, 10)
        const reportTitle = `Sprint Closeout — ${sprint.client_name} — ${sprint.start_date} → ${today}`

        const recommendationLabel: Record<string, string> = {
          continue_as_proof_brand: 'Continue as Proof Brand',
          repeat_sprint:           'Repeat Sprint',
          pause:                   'Pause',
        }

        const contentBody = [
          report.summary,
          '',
          `Recommendation: ${recommendationLabel[report.recommendation] ?? report.recommendation}`,
          report.rationale,
          '',
          'Key Learnings:',
          ...report.keyLearnings.map(l => `• ${l}`),
          '',
          'Next Steps:',
          ...report.nextSteps.map(s => `• ${s}`),
        ].join('\n')

        const { data: approvalRow, error: approvalErr } = await supabase
          .from('approval_queue')
          .insert({
            sop_id:       SOP_ID,
            sop_name:     SOP_NAME,
            status:       'pending',
            priority:     'high',
            content_type: 'client_report',
            content_id:   crypto.randomUUID(),
            content: {
              title:  reportTitle,
              body:   contentBody,
              metadata: {
                client_name:      sprint.client_name,
                sprint_id:        sprint.id,
                sprint_day:       sprint.day_number,
                total_leads:      metrics.totalLeads,
                final_cpl:        metrics.finalCPL,
                budget_used_pct:  metrics.budgetUtilisation,
                recommendation:   report.recommendation,
                key_learnings:    report.keyLearnings,
                next_steps:       report.nextSteps,
              },
            },
          })
          .select('id')
          .single()

        if (approvalErr) {
          console.error(`[sop-26] approval_queue insert failed for ${sprint.client_name}: ${approvalErr.message}`)
          errors.push(`approval ${sprint.client_name}: ${approvalErr.message}`)
        } else {
          approvalCreated++
          approvalIds.push(approvalRow?.id ?? '')
          console.log(`[sop-26] approval item created for ${sprint.client_name}: ${approvalRow?.id}`)
        }

        // ── 3d. Create ai_alert for sprint completion ────────────────────────
        const alertMsg = [
          `Sprint complete — ${sprint.client_name}: ${metrics.totalLeads} leads at CPL £${metrics.finalCPL.toFixed(2)}.`,
          `Recommendation: ${recommendationLabel[report.recommendation] ?? report.recommendation}.`,
        ].join(' ')

        const suggestedAction = report.nextSteps[0]
          ?? `Review sprint results for ${sprint.client_name} and action the closeout recommendation`

        const { error: alertErr } = await supabase.from('ai_alerts').insert({
          severity:         'info',
          sop_id:           SOP_ID,
          category:         'Sprint Closeout',
          message:          alertMsg,
          suggested_action: suggestedAction,
          client_name:      sprint.client_name,
          resolved:         false,
        })

        if (alertErr) {
          console.error(`[sop-26] alert insert failed for ${sprint.id}: ${alertErr.message}`)
          errors.push(`alert ${sprint.id}: ${alertErr.message}`)
        } else {
          alertsCreated++
          console.log(`[sop-26] alert created for ${sprint.client_name}`)
        }
      } catch (sprintErr) {
        const msg = sprintErr instanceof Error ? sprintErr.message : String(sprintErr)
        console.error(`[sop-26] error processing sprint ${sprint.id}: ${msg}`)
        errors.push(`${sprint.client_name}: ${msg}`)
      }
    }

    // ── 4. Audit log ─────────────────────────────────────────────────────────
    const outputSummary =
      `${closedOut} sprints closed, ${approvalCreated} approval items created, ${alertsCreated} alerts raised` +
      (errors.length > 0 ? `, ${errors.length} errors: ${errors.slice(0, 3).join('; ')}` : '')

    await supabase.from('ai_task_log').insert({
      sop_id:         SOP_ID,
      sop_name:       SOP_NAME,
      tool_called:    SONNET,
      status:         errors.length > 0 && closedOut === 0 ? 'failure' : 'success',
      duration_ms:    Date.now() - startedAt,
      input_summary:  `${sprints.length} sprints started ≤ ${threshold}`,
      output_summary: outputSummary,
    })

    return new Response(
      JSON.stringify({
        processed:              sprints.length,
        sprints_closed:         closedOut,
        approval_items_created: approvalCreated,
        alerts_created:         alertsCreated,
        approval_ids:           approvalIds,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[sop-26] fatal: ${message}`)

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      await supabase.from('ai_task_log').insert({
        sop_id:         SOP_ID,
        sop_name:       SOP_NAME,
        tool_called:    SONNET,
        status:         'failure',
        duration_ms:    Date.now() - startedAt,
        input_summary:  'sprint closeout run',
        output_summary: `Error: ${message}`,
      })
    } catch { /* ignore logging failure */ }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
