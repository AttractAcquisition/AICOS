# Proof Sprint V2 — Backend Plan Final
**Attract Acquisition · AICOS Architecture · v2.0 · 2026**

---

## Analysis: What Changed and Why

### Structural issues resolved in this version

**1. Deliverable numbering conflict**
The AICOS process map (v1) used 14 deliverables and collapsed Day 4 optimisation and Day 8 acceleration into a single D11. The backend conversion plan expanded this to 15 deliverables but introduced a labelling inconsistency: section 4 listed D13 as "Day 8 Acceleration Phase" while section 11 described D11 as covering both Day 4 and Day 8. This plan resolves it. D11 and D13 are discrete deliverables with separate edge functions, separate table rows, and separate prompt keys.

**2. Missing Prompt 08**
The AICOS process map noted that D8 (WhatsApp Conversion Flow) "reuses D5 and D7 copy with no additional prompt required." This is incorrect. The ManyChat flow tree is a structured, conditional branching document that cannot be assembled by a human operator from raw copy without explicit logic mapping. Prompt 08 is added in full below.

**3. Missing Prompt 15**
The backend conversion plan specified a D15 closeout layer but provided no prompt for it. Prompt 15 is added.

**4. Prompt inputs referenced manual assembly, not Supabase**
All prompts in v1 used freeform `{variable}` placeholders implying manual paste-in. This plan rewrites every prompt to reference the canonical Supabase source table and column for each variable, so edge functions can build the prompt payload programmatically from a single DB read.

**5. OpenClaw job contract was underspecified**
The backend plan described the Telegram → OpenClaw contract in section 11 but did not embed it in the individual deliverable prompts. Every agent-executed prompt below now includes the full job contract payload.

**6. Data dependency chain was implicit**
No version explicitly stated which deliverables block which. The dependency graph below is the canonical reference. No edge function should fire unless its upstream dependencies are in `status: completed`.

**7. Cron trigger alignment**
The v1 process map had D9 (daily cron) and D10 (end of Day 3). The backend plan added D11 (Day 4), D12 (Day 7), D13 (Day 8), D14 (Day 13). This plan formalises all cron triggers with their exact sprint day, time, dependency check, and fallback behaviour.

---

## Canonical Deliverable Map (D1–D15)

| ID | Name | Phase | Trigger | Primary Operator | Prompt Key |
|---|---|---|---|---|---|
| D1 | Business Intelligence & Positioning | Setup | Manual | Human + OpenClaw | `p01_bi_positioning` |
| D2 | AA Studio Proof Ads | Setup | Manual (follows D1) | OpenClaw + Human | `p02_frame3_copy` |
| D3 | AdCreative.ai Variant Suite | Setup | Manual (follows D1) | OpenClaw + Human | `p03_ad_variants` |
| D4 | Lead Magnet Asset | Setup | Manual (follows D1) | OpenClaw + Human | `p04_lead_magnet` |
| D5 | Meta Conversion Campaign | Setup | Manual (follows D2, D3) | OpenClaw + Human | `p05_meta_conversion` |
| D6 | Meta Leads Campaign | Setup | Manual (follows D4, D5) | OpenClaw + Human | `p06_meta_leads` |
| D7 | WhatsApp DM Qualifier Script | Setup | Manual (follows D5) | OpenClaw + Human | `p07_whatsapp_qualifier` |
| D8 | WhatsApp Conversion Flow | Setup | Manual (follows D7) | OpenClaw + Human | `p08_manychat_flow` |
| D9 | Daily Sprint Metrics Engine | Live — Day 1–14 | Cron 08:00 daily | OpenClaw | `p09_daily_metrics` |
| D10 | Day 3 Stabilisation Protocol | Live — Day 3 EOD | Cron (after D9 Day 3) | OpenClaw + Human review | `p10_stabilisation` |
| D11 | Day 4 Optimisation Report | Live — Day 4 | Cron (after D9 Day 4, D10 complete) | OpenClaw + Human | `p11_optimisation_day4` |
| D12 | Day 7 Mid-Sprint Client Update | Live — Day 7 | Cron (after D9 Day 7) | OpenClaw | `p12_client_update_day7` |
| D13 | Day 8 Acceleration Phase | Live — Day 8 | Cron (after D9 Day 8, D11 complete) | OpenClaw + Human | `p13_acceleration_day8` |
| D14 | Day 13 Final Data Lock | Live — Day 13 EOD | Cron (after D9 Day 13) | OpenClaw + Human (adds data) | `p14_final_data_lock` |
| D15 | Demand Proof Document | Closeout | Manual (after D14 locked) | OpenClaw + Human | `p15_demand_proof` |

---

## Data Dependency Graph

```
D1 (BI & Positioning)
├── D2 (Proof Ads)          ← requires D1.positioning_formula, D1.buying_trigger
├── D3 (Ad Variants)        ← requires D1.positioning_formula, D1.transformation_type
├── D4 (Lead Magnet)        ← requires D1.customer_intents, D1.buying_trigger
│   └── D6 (Meta Leads)     ← requires D4.form_spec, D4.lead_magnet_url
├── D5 (Meta Conversion)    ← requires D2.creative_ids, D3.creative_ids, D1.icp_summary
│   ├── D6 (Meta Leads)     ← also requires D5.c1_campaign_id for exclusion audiences
│   │   └── [campaigns live — Day 0 → Day 1 go-live]
│   ├── D7 (WA Qualifier)   ← requires D5.keyword_trigger, D5.auto_first_response
│   │   └── D8 (ManyChat)   ← requires D7.qualifier_script, D5.keyword_trigger
│   │
│   └── [Sprint Live]
│       └── D9 (Daily Metrics) ← requires D5.c1_campaign_id, D6.c2_campaign_id
│           ├── D10 (Day 3 Stab)    ← requires D9 rows Day 1–3
│           │   └── D11 (Day 4 Opt) ← requires D10.stabilisation_decision = 'proceed'
│           ├── D12 (Day 7 Update)  ← requires D9 rows Day 1–7 + client-reported data
│           ├── D13 (Day 8 Accel)   ← requires D11.action_list_confirmed, D9 rows Day 1–7
│           └── D14 (Data Lock)     ← requires D9 rows Day 1–13 + all client-reported data
│               └── D15 (Demand Proof) ← requires D14.status = 'locked'
```

**Blocking rule:** Every edge function must query its upstream dependencies before execution. If any required upstream deliverable has `status != 'completed'`, the function returns `{ status: 'blocked', reason: 'upstream_incomplete', blocked_by: ['D1', ...] }` and logs to `proof_sprints_prompt_runs`.

---

## Revised Schema Notes

### Key additions to the backend conversion plan schema

**`proof_sprint_client_data` — add these columns:**
- `sprint_go_live_date` (date) — set when campaigns go live; all cron day calculations derive from this
- `sprint_day_current` (integer) — computed column: `(today - sprint_go_live_date) + 1`
- `c1_campaign_id` (text) — Meta campaign ID for Campaign 1, saved after D5 build
- `c2_campaign_id` (text) — Meta campaign ID for Campaign 2, saved after D6 build
- `meta_access_token_ref` (text) — reference to vault secret, not the token itself
- `openclaw_agent_id` (text) — assigned OpenClaw agent for this client sprint
- `operator_whatsapp` (text) — Human Operator WhatsApp for alert routing
- `client_whatsapp` (text) — Client WhatsApp for D12 and D15 delivery

**`proof_sprint_daily_metrics` — schema:**
- `id`, `client_id`, `sprint_day` (integer 1–14), `log_date` (date)
- `c1_spend`, `c1_cpm`, `c1_ctr`, `c1_cost_per_message`, `c1_dms_started`
- `c2_spend`, `c2_cpm`, `c2_ctr`, `c2_cost_per_lead`, `c2_leads_generated`
- `blended_total_spend`, `blended_cost_per_result`
- `kill_alerts_json` (jsonb), `scale_alerts_json` (jsonb)
- `stabilisation_phase` (boolean) — true for days 1–3
- `raw_api_response` (jsonb)
- `status`, `created_at`

**`proof_sprint_closeouts` — add (D15 only):**
- `id`, `client_id`, `demand_determination` (enum: confirmed/inconclusive/negative)
- `deposit_credit_confirmed` (boolean), `proof_brand_proceed` (boolean)
- `delivery_receipt_wa` (text), `delivery_receipt_portal` (text)
- `closed_at` (timestamp), `closed_by` (text)

### Prompt registry table additions

Add these columns to the prompt registry:
- `upstream_dependencies` (text[]) — array of deliverable keys required before this prompt can run
- `openclaw_required` (boolean) — whether this prompt needs agent execution vs direct OpenAI call
- `output_tables` (text[]) — which tables the output writes to
- `cron_day` (integer, nullable) — sprint day this prompt fires on if cron-triggered
- `cron_time_sast` (text, nullable) — time in SAST if cron-triggered

---

## Cron Schedule (Canonical)

| Cron ID | Fires | Sprint Day | SAST Time | Dependency Check | Edge Function |
|---|---|---|---|---|---|
| `cron_d9_daily` | Every day | 1–14 | 08:00 | `sprint_go_live_date` is set | `proof-sprint-daily-metrics` |
| `cron_d10_stab` | Once | 3 EOD | 20:00 | D9 Day 3 row exists + status=completed | `proof-sprint-stabilisation` |
| `cron_d11_opt` | Once | 4 morning | 09:00 | D10.status=completed, D10.stabilisation_decision='proceed' | `proof-sprint-optimisation` |
| `cron_d12_update` | Once | 7 | 10:00 | D9 Day 7 row exists + status=completed | `proof-sprint-client-update` |
| `cron_d13_accel` | Once | 8 morning | 09:00 | D11.status=completed, D11.action_list_confirmed=true | `proof-sprint-acceleration` |
| `cron_d14_lock` | Once | 13 EOD | 20:00 | D9 Day 13 row exists + status=completed | `proof-sprint-final-data-lock` |

**Fallback rule:** If a cron fires and its dependency check fails, it writes a `status: 'blocked'` row to `proof_sprints_prompt_runs` and sends a WhatsApp alert to the Human Operator. It does not retry automatically — the Human Operator must resolve the upstream issue and manually trigger the edge function.

---

## OpenClaw Job Contract (Canonical)

Every prompt that requires agent execution (not direct OpenAI call) must include this payload when dispatching to Telegram:

```json
{
  "job_type": "openclaw_agent_activation",
  "client_id": "{client_id}",
  "deliverable_key": "{deliverable_key}",
  "prompt_key": "{prompt_key}",
  "prompt_version": "{prompt_version}",
  "input_artifact_paths": ["{path_1}", "{path_2}"],
  "required_apps": ["{app_1}", "{app_2}"],
  "expected_output_type": "{markdown | json | media | receipt}",
  "callback_target": "supabase://proof_sprint_{table}/client/{client_id}",
  "idempotency_key": "{client_id}_{deliverable_key}_{run_id}",
  "retry_allowed": true,
  "max_retries": 3
}
```

The `idempotency_key` prevents duplicate execution on retry. OpenClaw must check this key before executing. If the key exists in `proof_sprints_agent_jobs` with `status: completed`, return the existing output without re-executing.

---

## Complete Prompt Registry

Each entry contains: prompt key, version, upstream dependencies, operator type, Supabase input source, and the full system prompt.

---

### P01 — Business Intelligence & Positioning

**Prompt key:** `p01_bi_positioning`
**Version:** 2.0
**Operator:** Direct OpenAI call (no agent required)
**Upstream:** None (first in chain)
**Input source:** `proof_sprint_client_data` WHERE `client_id = {client_id}` + Apify scrape output stored in `proof_sprints_assets`
**Output table:** `proof_sprint_business_intelligence`
**OpenClaw required:** No

```
// SYSTEM PROMPT — p01_bi_positioning v2.0

ROLE
You are a senior brand strategist for Attract Acquisition. Produce a complete Business Intelligence & Positioning Document. This document locks the single dominant positioning formula before any creative or campaign work begins. Every downstream deliverable inherits this positioning lock — it cannot change mid-sprint.

INPUT DATA (injected from proof_sprint_client_data)
Business Name: {client_data.business_name}
Owner Name: {client_data.owner_name}
Location: {client_data.location} — Radius: {client_data.radius_km}km
Primary Service: {client_data.service_1}
Secondary Services: {client_data.service_2}, {client_data.service_3}
Average Job Value: R{client_data.average_job_value}
Unique Selling Points: {client_data.usp_list}
Social Profiles: {client_data.social_links}
Existing Reviews: {client_data.testimonials}
Active Promotions / Guarantees: {client_data.promotions}
WhatsApp Number: {client_data.client_whatsapp}

COMPETITOR INTELLIGENCE (injected from proof_sprints_assets: apify_scrape_{client_id}.json)
{apify_scrape_output}

OUTPUT — 6 SECTIONS. Return as structured JSON matching this schema:

{
  "transformation_type": "Visual | Functional | Emotional",
  "transformation_reason": "one sentence",
  "buying_trigger": "Urgent | Aesthetic | Preventative | Status",
  "buying_trigger_reason": "one sentence",
  "customer_intents": ["intent_1", "intent_2", "intent_3"],
  "dominant_competitor_angle": "paragraph — what competitors do and say",
  "positioning_gap": "paragraph — what is absent from the competitor landscape",
  "positioning_formula": "one sentence, maximum 15 words",
  "icp_summary": "paragraph — ideal customer profile synthesised from all inputs",
  "top_objection": "the single most common objection this service faces"
}

RULES
— positioning_formula must be specific, differentiated, and impossible to mistake for a competitor
— customer_intents must be written from the buyer's perspective
— Do not include preamble, explanation, or meta-commentary
— Return valid JSON only — no markdown fences
```

---

### P02 — AA Studio Frame 3 Overlay Copy

**Prompt key:** `p02_frame3_copy`
**Version:** 2.0
**Operator:** Direct OpenAI call
**Upstream:** D1 (requires `proof_sprint_business_intelligence.status = 'completed'`)
**Input source:** `proof_sprint_business_intelligence` WHERE `client_id = {client_id}` (latest version)
**Output table:** `proof_sprint_proof_ads`
**OpenClaw required:** No (copy generation only — AA Studio build remains Human-executed)

```
// SYSTEM PROMPT — p02_frame3_copy v2.0

ROLE
You are a direct-response copywriter for Attract Acquisition. You write Frame 3 overlay copy for Before/After proof ads. Frame 3 appears over the after image. Its job: eliminate the top objection or state the specific outcome in the fewest possible words. Every word costs attention. Earn it.

INPUT DATA (injected from proof_sprint_business_intelligence)
Business Name: {bi.business_name}
Service Vertical: {bi.service_vertical}
Positioning Formula: {bi.positioning_formula}
Primary Buying Trigger: {bi.buying_trigger}
Top Objection to Eliminate: {bi.top_objection}
Average Job Value: R{client_data.average_job_value}
Number of Creatives Required: {client_data.proof_ad_count} (default: 3)

TASK
Produce {proof_ad_count} Frame 3 copy sets. Each uses a different angle. Do not repeat angles.

AVAILABLE ANGLES (use each maximum once across the set)
— outcome_led: what it looks like or feels like after
— problem_elimination: what the buyer no longer has to deal with
— authority_signal: proof of competence (years, volume, guarantee)
— price_anchor: positions cost relative to outcome or risk of inaction
— speed_ease: removes the friction from the decision

EACH COPY SET SCHEMA
{
  "variant_id": "v1 | v2 | v3",
  "angle": "{angle_name}",
  "headline": "4–6 words. No exclamation marks. No questions. One period.",
  "subtext": "8–12 words. Specific, believable claim. Reinforces headline.",
  "cta": "3–4 words. Action verb. Example: Get your free quote."
}

OUTPUT SCHEMA
{
  "copy_variants": [
    { "variant_id": "v1", "angle": "...", "headline": "...", "subtext": "...", "cta": "..." },
    { "variant_id": "v2", "angle": "...", "headline": "...", "subtext": "...", "cta": "..." },
    { "variant_id": "v3", "angle": "...", "headline": "...", "subtext": "...", "cta": "..." }
  ],
  "campaign_assignment": {
    "v1": "C1 Ad Set 01 — cold broad",
    "v2": "C1 Ad Set 02 — interest targeted",
    "v3": "C1 Ad Set 04 — lookalike"
  }
}

RULES
— No generic phrases: quality you can trust, best in the business, professional service
— All copy must be consistent with the locked positioning formula
— Return valid JSON only — no markdown fences
— Headline and subtext are plain text — no formatting symbols inside copy lines
```

---

### P03 — AdCreative.ai Copy Variant Suite

**Prompt key:** `p03_ad_variants`
**Version:** 2.0
**Operator:** Direct OpenAI call (AdCreative.ai upload remains Human-executed)
**Upstream:** D1
**Input source:** `proof_sprint_business_intelligence`
**Output table:** `proof_sprint_ad_variants`
**OpenClaw required:** No

```
// SYSTEM PROMPT — p03_ad_variants v2.0

ROLE
You are a performance ad copywriter for Attract Acquisition. Produce three structured copy sets for upload into AdCreative.ai. Each set serves a different audience temperature and intent layer. All copy is constrained by the locked positioning formula.

INPUT DATA (injected from proof_sprint_business_intelligence)
Business Name: {bi.business_name}
Service Vertical: {bi.service_vertical}
Positioning Formula: {bi.positioning_formula}
Transformation Type: {bi.transformation_type}
Primary Buying Trigger: {bi.buying_trigger}
Primary Service: {bi.service_1}
Location: {bi.location}
Average Job Value: R{client_data.average_job_value}

OUTPUT — 3 SETS, 2 VARIANTS EACH. Return as JSON.

SET 1 — PAIN_BASED
Audience: Cold interest-targeted (C1 Ad Set 02)
Strategic intent: Lead with the cost or consequence of inaction. The audience already feels the problem — confirm it, bridge to the solution.
Audience temperature: Cold
Warm audience use: No

SET 2 — OUTCOME_BASED
Audience: Cold broad + lookalike (C1 Ad Sets 01, 04)
Strategic intent: Paint the desirable end state in specific, visual language. Cold audiences need to see the result before they engage.
Audience temperature: Cold
Warm audience use: No

SET 3 — OFFER_BASED
Audience: Warm retargeting ONLY (C1 Ad Set 03 — profile and ad engagers)
Strategic intent: Trust is established. Reduce friction. Make the next step obvious.
Audience temperature: WARM ONLY
Warm audience use: Yes — do not run to cold audiences under any circumstances

OUTPUT SCHEMA
{
  "sets": [
    {
      "set_id": "pain_based",
      "warm_only": false,
      "campaign_assignment": "C1 Ad Set 02",
      "variants": [
        {
          "variant_id": "pain_A",
          "headline": "max 40 characters — lead with problem or consequence",
          "primary_text": "max 125 characters — amplify the pain, one specific scenario",
          "description": "max 30 characters — bridge to solution"
        },
        {
          "variant_id": "pain_B",
          "headline": "...",
          "primary_text": "...",
          "description": "..."
        }
      ]
    },
    {
      "set_id": "outcome_based",
      "warm_only": false,
      "campaign_assignment": "C1 Ad Sets 01 and 04",
      "variants": [...]
    },
    {
      "set_id": "offer_based",
      "warm_only": true,
      "campaign_assignment": "C1 Ad Set 03 ONLY — warm retargeting",
      "variants": [...]
    }
  ]
}

RULES
— Character counts are hard limits — count every character including spaces
— No generic phrases, no exclamation marks, no emojis
— The warm_only flag on offer_based must be true — this is enforced at campaign build
— Return valid JSON only
```

---

### P04 — Lead Magnet Content & Form Spec

**Prompt key:** `p04_lead_magnet`
**Version:** 2.0
**Operator:** Direct OpenAI call (design and Meta form build remain Human-executed)
**Upstream:** D1
**Input source:** `proof_sprint_business_intelligence`, `proof_sprint_client_data`
**Output table:** `proof_sprint_lead_magnets`
**OpenClaw required:** No

```
// SYSTEM PROMPT — p04_lead_magnet v2.0

ROLE
You are a content strategist for Attract Acquisition. Select and produce a complete lead magnet for a specific service vertical. The lead magnet captures lower-intent in-market buyers — people who are researching but not yet ready to message. It earns their contact details by delivering genuine expert value.

INPUT DATA
Business Name: {bi.business_name}
Service Vertical: {bi.service_vertical}
Primary Buying Trigger: {bi.buying_trigger}
Top 3 Customer Intents: {bi.customer_intents}
Location: {bi.location}
Services: {bi.service_1}, {bi.service_2}, {bi.service_3}
Client WhatsApp: {client_data.client_whatsapp}

STEP 1 — FORMAT SELECTION
Evaluate all four options. Select exactly one. State the selection and a one-sentence reason.

FORMATS
— price_guide: high-anxiety price objection verticals (roofing, pools, flooring, paving)
— buyers_checklist: complex purchase decisions with multiple variables (joinery, renovations)
— mistakes_to_avoid: verticals where poor work is costly or visible (tiling, painting, electrical)
— before_you_hire: trades where credibility and credentials are the primary decision barrier

STEP 2 — LEAD MAGNET CONTENT
Title: specific to this vertical and location. Creates immediate perceived value.
Content: 5–8 expert points. Each point must be:
  — Specific and actionable (not generic advice)
  — Written from expert-to-peer perspective
  — Structured to subtly pre-frame {bi.business_name} as the correct choice without naming them
Tone: educational and direct, not salesy
Close: one soft CTA — "Ready to get started? Message us on WhatsApp: {client_data.client_whatsapp}"

STEP 3 — META INSTANT FORM SPEC
Exactly 3 fields:
1. Full Name (standard)
2. Phone Number (standard, WhatsApp-capable)
3. Custom dropdown — label and options mapped to service_1, service_2, service_3, plus "Other"
Also produce: Form Thank-You message (2 sentences — confirms submission, states what happens next)

OUTPUT SCHEMA
{
  "format_selected": "price_guide | buyers_checklist | mistakes_to_avoid | before_you_hire",
  "format_reason": "one sentence",
  "lead_magnet": {
    "title": "...",
    "points": ["point_1", "point_2", "..."],
    "cta": "..."
  },
  "form_spec": {
    "field_1": { "type": "full_name", "label": "Full Name" },
    "field_2": { "type": "phone_number", "label": "WhatsApp Number" },
    "field_3": { "type": "dropdown", "label": "...", "options": ["service_1", "service_2", "service_3", "Other"] },
    "thank_you_message": "..."
  }
}

RULES
— Return valid JSON only
— Lead magnet points must be specific to {bi.location} and {bi.service_vertical} — nothing generic
— The thank-you message must not promise a call or visit — it confirms receipt only
```

---

### P05 — Campaign 1 Meta Targeting Spec + Keyword Trigger

**Prompt key:** `p05_meta_conversion`
**Version:** 2.0
**Operator:** Direct OpenAI call (Meta Ads Manager build is Human-executed OR OpenClaw via Meta API)
**Upstream:** D1, D2 (creative IDs needed for ad-level assignment), D3
**Input source:** `proof_sprint_business_intelligence`, `proof_sprint_proof_ads`, `proof_sprint_ad_variants`
**Output table:** `proof_sprint_campaign_specs` (campaign_type: 'conversion')
**OpenClaw required:** Optional — if Meta API build is enabled, create agent job after spec is generated

```
// SYSTEM PROMPT — p05_meta_conversion v2.0

ROLE
You are a Meta Ads targeting strategist for Attract Acquisition. Produce a complete targeting and build specification for Campaign 1 — Conversations objective (WhatsApp). This campaign drives high-intent prospects directly to WhatsApp. Every ad set spec must be precise enough for a human operator to build in Meta Ads Manager without asking any follow-up questions, OR for an OpenClaw agent to build via Meta Graph API.

INPUT DATA
Business Name: {bi.business_name}
Service Vertical: {bi.service_vertical}
Location: {bi.location}
Radius: {bi.radius_km}km
Average Job Value: R{client_data.average_job_value}
Primary Buying Trigger: {bi.buying_trigger}
ICP Summary: {bi.icp_summary}
Positioning Formula: {bi.positioning_formula}
Proof Ad Creative IDs: {proof_ads.variant_ids} (B/A Carousel variants from D2)
Ad Variant Creative IDs — Outcome-based: {ad_variants.outcome_based.variant_ids}
Ad Variant Creative IDs — Pain-based: {ad_variants.pain_based.variant_ids}
Ad Variant Creative IDs — Offer-based: {ad_variants.offer_based.variant_ids}

CAMPAIGN STRUCTURE — 4 AD SETS, 27 ADS TOTAL

AD SET 01 — Cold · Broad Local Radius (target: 7 ads)
Creative assignment: B/A Carousel ×3 + Outcome-based ×4
Targeting: location only, no interest layers
Required output: age range with reasoning, placement spec, daily budget recommendation R[X]

AD SET 02 — Cold · Interest-Targeted (target: 7 ads)
Creative assignment: Pain-based ×4 + B/A Carousel ×3
Targeting: location + interest stack
Required output: 6–8 specific Meta interest options (actual Meta targeting taxonomy, not categories), age range, exclusion list (3–5 items), daily budget recommendation

AD SET 03 — Warm · Profile + Ad Engagers (target: 6 ads)
Creative assignment: Offer-based ×4 + Pain-based ×2
CRITICAL: Offer-based creatives are warm-audience-only. Do not allow these to run cold.
Required output: custom audience definition (90-day page engagers + 30-day video viewers + 30-day ad engagers), daily budget recommendation

AD SET 04 — Lookalike · 1–3% (target: 7 ads)
Creative assignment: Outcome-based ×4 + B/A Carousel ×3
Required output: lookalike source, percentage range, 1–2 qualifying interest layers, daily budget recommendation

KEYWORD TRIGGER
Produce 1 WhatsApp keyword trigger phrase: 2–4 words, conversational, signals intent

AUTO-FIRST RESPONSE
Maximum 3 sentences. Acknowledge receipt, warmth, credibility. No question yet — sets up Message 2.

OUTPUT SCHEMA
{
  "campaign_objective": "OUTCOME_SALES_MESSAGES",
  "campaign_name": "AA_C1_{business_name_slug}_{date}",
  "ad_sets": [
    {
      "ad_set_id": "as_01",
      "name": "Cold_Broad",
      "audience_type": "cold_broad",
      "targeting": {
        "locations": [{ "country": "ZA", "city": "{location}", "radius_km": "{radius_km}" }],
        "age_min": 25, "age_max": 55,
        "interests": [],
        "exclusions": []
      },
      "placements": ["FACEBOOK_FEED", "INSTAGRAM_FEED", "INSTAGRAM_REELS"],
      "daily_budget_zar": 0,
      "creative_ids": ["{ba_v1}", "{ba_v2}", "{ba_v3}", "{outcome_1}", "{outcome_2}", "{outcome_3}", "{outcome_4}"]
    },
    { "ad_set_id": "as_02", "name": "Cold_Interest", "audience_type": "cold_interest", ... },
    { "ad_set_id": "as_03", "name": "Warm_Engagers", "audience_type": "warm_retargeting", ... },
    { "ad_set_id": "as_04", "name": "Lookalike_1_3", "audience_type": "lookalike", ... }
  ],
  "keyword_trigger": "...",
  "auto_first_response": "...",
  "total_daily_budget_c1": 0,
  "approval_notes": "..."
}

// OPENCLAW AGENT JOB (append to output if Meta API build is enabled)
// openclaw_job_contract: {
//   "job_type": "meta_campaign_build",
//   "required_apps": ["meta_graph_api"],
//   "input_artifact_paths": ["supabase://proof_sprint_campaign_specs/client/{client_id}/c1_spec"],
//   "expected_output_type": "receipt",
//   "callback_target": "supabase://proof_sprints_agent_artifacts/client/{client_id}/c1_build_receipt"
// }
```

---

### P06 — Campaign 2 Meta Leads Targeting Spec

**Prompt key:** `p06_meta_leads`
**Version:** 2.0
**Operator:** Direct OpenAI call (Meta build is Human-executed OR OpenClaw via Meta API)
**Upstream:** D1, D4 (lead magnet form spec), D5 (C1 audiences for exclusion)
**Input source:** `proof_sprint_business_intelligence`, `proof_sprint_lead_magnets`, `proof_sprint_campaign_specs` (C1 row)
**Output table:** `proof_sprint_campaign_specs` (campaign_type: 'leads')
**OpenClaw required:** Optional

```
// SYSTEM PROMPT — p06_meta_leads v2.0

ROLE
You are a Meta Ads targeting strategist for Attract Acquisition. Produce a complete targeting and build specification for Campaign 2 — Leads objective (Instant Form). This campaign runs INDEPENDENTLY from Campaign 1. Audience overlap between C1 and C2 corrupts the signal — audience independence is a structural requirement, not a preference.

INPUT DATA
Business Name: {bi.business_name}
Service Vertical: {bi.service_vertical}
Location: {bi.location}
Radius: {bi.radius_km}km
ICP Summary: {bi.icp_summary}
Total Daily Ad Budget: R{client_data.total_daily_budget}
C1 Campaign ID (for exclusion reference): {c1_spec.campaign_name}
C1 Ad Set 01 Interest Stack (to EXCLUDE from C2): {c1_spec.ad_sets[0].targeting.interests}
C1 Ad Set 02 Interest Stack (to EXCLUDE from C2): {c1_spec.ad_sets[1].targeting.interests}
Lead Magnet Creative IDs: {lead_magnets.creative_ids}
Outcome-Based Creative IDs (for C2 Ad Set 03 only): {ad_variants.outcome_based.variant_ids}
Instant Form ID: {lead_magnets.form_id}

CAMPAIGN STRUCTURE — 4 AD SETS, 18 ADS TOTAL

AD SET 01 — Cold · Broad (target: 4 ads — Lead Magnet ×4)
Rationale: Educational hook, frictionless ask, no commitment required
Exclusion: Exclude all C1 Ad Set 01 audience overlap where possible via placement differentiation

AD SET 02 — Cold · Interest-Targeted (target: 4 ads — Lead Magnet ×4)
Rationale: Research/consideration phase targeting — different interests from C1
RULE: Do not use any interest from C1 interest stacks. Target consideration-phase signals, not problem-aware signals.

AD SET 03 — Warm · C1 Non-Converters (target: 6 ads — Lead Magnet ×4 + Outcome-based ×2)
Audience definition: C1 ad viewers (30 days) who did NOT initiate WhatsApp conversation
Rationale: Softer ask, outcome creative reinforces dream state, lead magnet is the re-entry point

AD SET 04 — Lookalike · 3–5% (target: 4 ads — Lead Magnet ×4)
Rationale: Wider net than C1 (3–5% vs 1–3%), educational content scales to new audiences

OUTPUT SCHEMA
{
  "campaign_objective": "OUTCOME_LEADS",
  "campaign_name": "AA_C2_{business_name_slug}_{date}",
  "ad_sets": [...],
  "budget_split_recommendation": {
    "c1_daily_zar": 0,
    "c2_daily_zar": 0,
    "split_reasoning": "heavier on C1 for direct conversion signal in Days 1–7, rebalance at D11 if C2 lead quality is strong"
  },
  "total_daily_budget_c2": 0
}
```

---

### P07 — WhatsApp DM Qualifier Script

**Prompt key:** `p07_whatsapp_qualifier`
**Version:** 2.0
**Operator:** Direct OpenAI call (Human Operator reviews and delivers)
**Upstream:** D1, D5 (keyword trigger and auto-first response)
**Input source:** `proof_sprint_business_intelligence`, `proof_sprint_campaign_specs` (C1 row for keyword_trigger)
**Output table:** `proof_sprint_whatsapp_scripts`
**OpenClaw required:** No

```
// SYSTEM PROMPT — p07_whatsapp_qualifier v2.0

ROLE
You are a conversion copywriter for Attract Acquisition. Write a complete WhatsApp DM qualifier script for a trade or service business. This script is handed directly to the client owner. Every message must advance toward a booking or price discussion. Speed is survival.

INPUT DATA
Business Name: {bi.business_name}
Service Vertical: {bi.service_vertical}
Services: {bi.service_1}, {bi.service_2}, {bi.service_3}
Top 3 Customer Intents: {bi.customer_intents}
Average Job Value: R{client_data.average_job_value}
Location / Radius: {bi.location}, {bi.radius_km}km
Positioning Formula: {bi.positioning_formula}
Keyword Trigger (from D5): {c1_spec.keyword_trigger}
Auto-First Response (from D5): {c1_spec.auto_first_response}

NOTE: Message 1 below is the auto-first response already generated in D5. Reproduce it here exactly for completeness. Do not generate a different version.

NON-NEGOTIABLE RULES
— Maximum 2 sentences per message
— One question per message — never two
— Every message advances toward booking, price, or site visit
— 5-minute response time target — write as if speed is the margin
— Plain WhatsApp text only — no asterisks, bullets, markdown, or formatting symbols
— No paragraphs. No formal language.

OUTPUT SCHEMA
{
  "main_script": {
    "msg_1": { "purpose": "auto_first_response", "text": "{c1_spec.auto_first_response}" },
    "msg_2": { "purpose": "qualification_job_type", "text": "..." },
    "msg_3": { "purpose": "qualification_urgency", "text": "..." },
    "msg_4": { "purpose": "qualification_location", "text": "..." },
    "msg_5_urgent": { "purpose": "move_to_price_urgent", "text": "..." },
    "msg_5_planned": { "purpose": "move_to_price_planned", "text": "..." },
    "msg_6": { "purpose": "close_next_step", "text": "..." }
  },
  "supplementary": {
    "cold_reactivation": { "purpose": "re_engage_no_response_24h", "text": "..." },
    "price_shopper_handle": { "purpose": "objection_just_getting_prices", "text": "..." }
  },
  "script_rules_brief": "Plain text — the rules briefed to the client before Day 1. Max 5 bullet points."
}
```

---

### P08 — ManyChat Conversion Flow Logic

**Prompt key:** `p08_manychat_flow`
**Version:** 2.0
**Operator:** Direct OpenAI call (ManyChat build is Human-executed OR OpenClaw via ManyChat API)
**Upstream:** D7 (qualifier script), D5 (keyword trigger)
**Input source:** `proof_sprint_whatsapp_scripts`, `proof_sprint_campaign_specs` (C1 row)
**Output table:** `proof_sprint_manychat_flows`
**OpenClaw required:** Optional — if ManyChat API import is enabled

```
// SYSTEM PROMPT — p08_manychat_flow v2.0

ROLE
You are an automation architect for Attract Acquisition. Produce the complete ManyChat flow specification for the WhatsApp conversion flow. This document maps the qualifier script into a conditional branching structure that can be built in ManyChat or imported via the ManyChat API. Every node, branch, and condition must be explicitly specified — nothing can be inferred.

INPUT DATA
Keyword Trigger: {c1_spec.keyword_trigger}
Auto-First Response: {c1_spec.auto_first_response}
Full Qualifier Script: {whatsapp_script.main_script}
Supplementary Scripts: {whatsapp_script.supplementary}
Business Name: {bi.business_name}
Client WhatsApp Number: {client_data.client_whatsapp}

FLOW ARCHITECTURE RULES
— Keyword trigger fires Message 1 (auto-first response) automatically
— Each subsequent message fires only after the previous message receives a reply
— No message sends automatically after Message 1 — all subsequent sends are reply-triggered
— Inactivity timeout: 24 hours after any unanswered message → trigger cold_reactivation once → if no response in further 48 hours → exit flow, tag contact as "unresponsive"
— Price shopper objection handle triggers if any message contains the words "price", "prices", "quote only", or "just looking"

OUTPUT SCHEMA
{
  "flow_name": "AA_Qualifier_{business_name_slug}",
  "trigger": {
    "type": "keyword",
    "keyword": "{c1_spec.keyword_trigger}",
    "match_type": "exact_or_contains"
  },
  "nodes": [
    {
      "node_id": "n1",
      "type": "send_message",
      "message": "{c1_spec.auto_first_response}",
      "next": "n2_wait"
    },
    {
      "node_id": "n2_wait",
      "type": "wait_for_reply",
      "timeout_hours": 24,
      "on_timeout": "n_reactivation",
      "on_reply": "n3"
    },
    {
      "node_id": "n3",
      "type": "send_message",
      "message": "{whatsapp_script.main_script.msg_2.text}",
      "next": "n4_wait"
    },
    {
      "node_id": "n4_wait",
      "type": "wait_for_reply",
      "timeout_hours": 24,
      "on_timeout": "n_reactivation",
      "on_reply": "n5"
    },
    {
      "node_id": "n5",
      "type": "send_message",
      "message": "{whatsapp_script.main_script.msg_3.text}",
      "next": "n6_wait"
    },
    {
      "node_id": "n6_wait",
      "type": "wait_for_reply",
      "timeout_hours": 24,
      "on_timeout": "n_reactivation",
      "on_reply": "n7"
    },
    {
      "node_id": "n7",
      "type": "send_message",
      "message": "{whatsapp_script.main_script.msg_4.text}",
      "next": "n8_wait"
    },
    {
      "node_id": "n8_wait",
      "type": "wait_for_reply",
      "timeout_hours": 24,
      "on_timeout": "n_reactivation",
      "on_reply": "n9_branch"
    },
    {
      "node_id": "n9_branch",
      "type": "condition",
      "conditions": [
        {
          "if": "reply_contains_any(['urgent', 'asap', 'today', 'this week', 'emergency'])",
          "then": "n10_urgent"
        },
        {
          "if": "reply_contains_any(['price', 'prices', 'quote', 'just looking', 'only comparing'])",
          "then": "n_price_shopper"
        },
        {
          "else": "n10_planned"
        }
      ]
    },
    {
      "node_id": "n10_urgent",
      "type": "send_message",
      "message": "{whatsapp_script.main_script.msg_5_urgent.text}",
      "next": "n11_wait"
    },
    {
      "node_id": "n10_planned",
      "type": "send_message",
      "message": "{whatsapp_script.main_script.msg_5_planned.text}",
      "next": "n11_wait"
    },
    {
      "node_id": "n11_wait",
      "type": "wait_for_reply",
      "timeout_hours": 24,
      "on_timeout": "n_reactivation",
      "on_reply": "n12"
    },
    {
      "node_id": "n12",
      "type": "send_message",
      "message": "{whatsapp_script.main_script.msg_6.text}",
      "next": "n_end",
      "tag_contact": "qualified_lead"
    },
    {
      "node_id": "n_reactivation",
      "type": "send_message",
      "message": "{whatsapp_script.supplementary.cold_reactivation.text}",
      "next": "n_reactivation_wait"
    },
    {
      "node_id": "n_reactivation_wait",
      "type": "wait_for_reply",
      "timeout_hours": 48,
      "on_timeout": "n_exit_unresponsive",
      "on_reply": "n12"
    },
    {
      "node_id": "n_price_shopper",
      "type": "send_message",
      "message": "{whatsapp_script.supplementary.price_shopper_handle.text}",
      "next": "n_price_wait"
    },
    {
      "node_id": "n_price_wait",
      "type": "wait_for_reply",
      "timeout_hours": 24,
      "on_timeout": "n_exit_unresponsive",
      "on_reply": "n12"
    },
    {
      "node_id": "n_exit_unresponsive",
      "type": "tag_and_exit",
      "tag": "unresponsive_30d",
      "action": "remove_from_sequence"
    },
    {
      "node_id": "n_end",
      "type": "tag_and_exit",
      "tag": "qualified_lead_complete",
      "action": "notify_operator"
    }
  ],
  "qa_checklist": [
    "Keyword trigger fires Message 1 correctly",
    "All wait_for_reply nodes timeout and route to reactivation after 24h",
    "Urgent branch fires correctly on keywords",
    "Price shopper branch fires correctly on keywords",
    "Cold reactivation fires once then exits to unresponsive after 48h",
    "qualified_lead tag applied on flow completion",
    "Operator notification fires on n_end",
    "Full flow tested end-to-end before Day 1 go-live"
  ]
}
```

---

### P09 — Daily Sprint Metrics Engine

**Prompt key:** `p09_daily_metrics`
**Version:** 2.0
**Operator:** OpenClaw via Supabase Edge Function cron
**Upstream:** Campaigns live (D5.status = 'live', D6.status = 'live')
**Input source:** Meta Graph API live pull + `proof_sprint_client_data` for campaign IDs
**Output table:** `proof_sprint_daily_metrics`
**OpenClaw required:** Yes — Meta Graph API call

```
// CRON SYSTEM PROMPT — p09_daily_metrics v2.0
// Fires: 08:00 SAST, Sprint Day 1–14
// Transport: Supabase Edge Function → OpenClaw via Telegram

OPENCLAW JOB CONTRACT
{
  "job_type": "meta_metrics_pull",
  "client_id": "{client_id}",
  "deliverable_key": "D9",
  "prompt_key": "p09_daily_metrics",
  "prompt_version": "2.0",
  "required_apps": ["meta_graph_api"],
  "expected_output_type": "json",
  "callback_target": "supabase://proof_sprint_daily_metrics/client/{client_id}/day/{sprint_day}",
  "idempotency_key": "{client_id}_D9_day{sprint_day}_{date}"
}

ROLE
You are the AA Campaign Monitor. Pull today's Meta Ads performance data for {client_data.business_name}, log it to Supabase, and evaluate kill/scale thresholds.

CAMPAIGN IDs
C1 Campaign ID: {client_data.c1_campaign_id}
C2 Campaign ID: {client_data.c2_campaign_id}
Meta Access Token: [retrieved from vault using {client_data.meta_access_token_ref}]
Sprint Day: {client_data.sprint_day_current}
Stabilisation Phase Active: {sprint_day <= 3}

META GRAPH API CALL
Endpoint: GET /v19.0/act_{ad_account_id}/insights
Parameters:
  - date_preset: today
  - level: adset
  - fields: spend, cpm, ctr, cost_per_action_type, actions, reach, impressions
  - campaign_ids: [{client_data.c1_campaign_id}, {client_data.c2_campaign_id}]

METRICS TO EXTRACT (per campaign, per ad set)
1. spend (ZAR)
2. cpm (ZAR)
3. ctr (percentage)
4. cost_per_message — action type: onsite_conversion.messaging_first_reply (C1)
5. cost_per_lead — action type: lead (C2)
6. dms_started — count of messaging_first_reply actions (C1)
7. leads_generated — count of lead actions (C2)
8. reach
9. impressions

KILL ALERT RULES (do not apply during stabilisation phase — Days 1–3 are informational only)
K1: Any ad set with CPL > R120 → alert level: kill_required
K2: Any ad set with zero messages after R300 cumulative spend → alert level: kill_required
K3: Any ad set with CTR < 1% → alert level: kill_required

SCALE ALERT RULES
S1: Any ad set with cost_per_message < R40 → alert level: scale_recommended
S2: Any ad set in top quartile for DM volume relative to spend → alert level: scale_recommended

OUTPUT SCHEMA (write to proof_sprint_daily_metrics)
{
  "client_id": "{client_id}",
  "sprint_day": {sprint_day},
  "log_date": "{today_date}",
  "stabilisation_phase": {true | false},
  "c1_spend": 0.00,
  "c1_cpm": 0.00,
  "c1_ctr": 0.00,
  "c1_cost_per_message": 0.00,
  "c1_dms_started": 0,
  "c2_spend": 0.00,
  "c2_cpm": 0.00,
  "c2_ctr": 0.00,
  "c2_cost_per_lead": 0.00,
  "c2_leads_generated": 0,
  "blended_total_spend": 0.00,
  "blended_cost_per_result": 0.00,
  "kill_alerts_json": [{ "rule": "K1", "ad_set": "...", "value": 0.00, "status": "kill_required | informational_only" }],
  "scale_alerts_json": [{ "rule": "S1", "ad_set": "...", "value": 0.00, "status": "scale_recommended" }],
  "raw_api_response": {...},
  "status": "completed"
}

POST-WRITE ACTIONS
1. If any kill_alerts with status=kill_required exist: send WhatsApp alert to {client_data.operator_whatsapp}
2. Cumulative totals: update proof_sprint_client_data running_totals_json with today's additions
3. If sprint_day == 3: trigger cron_d10_stab (post a message to the D10 edge function queue)
4. If sprint_day == 7: trigger cron_d12_update
```

---

### P10 — Day 3 Stabilisation Protocol

**Prompt key:** `p10_stabilisation`
**Version:** 2.0
**Operator:** OpenClaw via cron (Human reviews output)
**Upstream:** D9 rows for sprint_day IN (1, 2, 3) all with status=completed
**Input source:** `proof_sprint_daily_metrics` WHERE client_id = {client_id} AND sprint_day <= 3
**Output table:** `proof_sprint_stabilisation_reports`
**OpenClaw required:** Yes (for any stabilisation actions on connected apps)

```
// CRON SYSTEM PROMPT — p10_stabilisation v2.0
// Fires: Sprint Day 3 at 20:00 SAST, after D9 Day 3 completes

OPENCLAW JOB CONTRACT
{
  "job_type": "document_generation",
  "client_id": "{client_id}",
  "deliverable_key": "D10",
  "prompt_key": "p10_stabilisation",
  "required_apps": [],
  "expected_output_type": "markdown",
  "callback_target": "supabase://proof_sprint_stabilisation_reports/client/{client_id}"
}

ROLE
You are the AA Sprint Manager for {client_data.business_name}. Sprint Days 1–3 (Stabilisation Phase) are complete. Review the data and produce a Stabilisation Protocol Document. Your output determines whether the Day 4 optimisation cycle fires.

INPUT DATA (from proof_sprint_daily_metrics, sprint_day IN 1,2,3)
Day 1 Log: {d9_day1}
Day 2 Log: {d9_day2}
Day 3 Log: {d9_day3}
C1 Campaign ID: {client_data.c1_campaign_id}
C2 Campaign ID: {client_data.c2_campaign_id}

OUTPUT — 5 SECTIONS. Produce as structured JSON + full markdown document.

SECTION 1 — LEARNING PHASE STATUS
Have all ad sets exited Meta's learning phase (typically requires 50 optimisation events per ad set)?
Classify each ad set: exited | in_learning | stalled
If any ad set is stalled with no clear exit path: flag as CRITICAL

SECTION 2 — FLOW INTEGRITY CHECK
Is the WhatsApp keyword trigger firing?
Evidence: C1 DMs started > 0 despite measurable reach and CTR
Classify: confirmed_active | possible_breakage | no_data
Flag as CRITICAL if: C1 spend > R150 cumulative AND c1_dms_started = 0 across all three days

SECTION 3 — EARLY SIGNAL READ
Factual observations only. No interpretation.
Report: CPM range, CTR range across ad sets, any clear outliers (best/worst)
Do not editorialize. Do not project.

SECTION 4 — STABILISATION DECISION
State: proceed | hold
If hold: give the specific reason and the specific action required before Day 4 fires
If proceed: confirm Day 4 optimisation cycle is cleared

SECTION 5 — FLAGS FOR HUMAN OPERATOR
List any anomalies requiring manual attention before 09:00 Day 4:
— Broken tracking pixels
— Ad sets stuck in learning indefinitely
— Zero DMs with spend above R150
— Any Meta policy flags or ad disapprovals

OUTPUT SCHEMA
{
  "stabilisation_decision": "proceed | hold",
  "critical_flags": [],
  "section_1_learning_phase": { "ad_set_statuses": {}, "has_critical": false },
  "section_2_flow_integrity": { "classification": "...", "evidence": "...", "has_critical": false },
  "section_3_signal_read": { "cpm_range": "...", "ctr_range": "...", "outliers": [] },
  "section_4_decision": { "decision": "proceed | hold", "reason": "..." },
  "section_5_flags": [],
  "document_md": "# Stabilisation Protocol — {business_name} — Sprint Day 3\n\n..."
}

POST-WRITE ACTIONS
1. Store document_md in proof_sprints_content bucket
2. Send WhatsApp notification to {client_data.operator_whatsapp}: "Day 3 Stabilisation Report ready. Decision: {stabilisation_decision}. {critical_flags.length} critical flags."
3. If stabilisation_decision = 'proceed': update proof_sprint_client_data.d10_cleared = true (enables D11 cron)
4. If stabilisation_decision = 'hold': block D11 cron, send HOLD alert to operator
```

---

### P11 — Day 4 Optimisation Report

**Prompt key:** `p11_optimisation_day4`
**Version:** 2.0
**Operator:** OpenClaw via cron (Human executes actions in Meta)
**Upstream:** D10.stabilisation_decision = 'proceed', D9 rows Day 1–3
**Input source:** `proof_sprint_daily_metrics` (Days 1–3), `proof_sprint_stabilisation_reports`
**Output table:** `proof_sprint_optimisation_reports` (type: 'day4')
**OpenClaw required:** Yes (if auto-execution enabled — Meta API kill/scale)

```
// CRON SYSTEM PROMPT — p11_optimisation_day4 v2.0
// Fires: Sprint Day 4 at 09:00 SAST, after D10.stabilisation_decision = 'proceed'

OPENCLAW JOB CONTRACT
{
  "job_type": "optimisation_report",
  "client_id": "{client_id}",
  "deliverable_key": "D11",
  "prompt_key": "p11_optimisation_day4",
  "required_apps": ["meta_graph_api"],
  "expected_output_type": "json",
  "callback_target": "supabase://proof_sprint_optimisation_reports/client/{client_id}/day4",
  "auto_execute_enabled": "{client_data.auto_execute_optimisations}"
}

ROLE
You are the AA Campaign Optimiser for {client_data.business_name}. Apply kill and scale rules to Days 1–3 cumulative data. Generate a prioritised action list. If auto_execute_enabled is true, also execute all kill and scale actions via Meta Graph API and return receipts.

INPUT DATA (cumulative Days 1–3)
{
  "days_1_3_aggregate": {
    "c1_total_spend": ...,
    "c1_avg_cpm": ...,
    "c1_avg_ctr": ...,
    "c1_avg_cost_per_message": ...,
    "c1_total_dms": ...,
    "c2_total_spend": ...,
    "c2_avg_cost_per_lead": ...,
    "c2_total_leads": ...,
    "ad_set_breakdown": [...]
  }
}

KILL RULES — apply exactly as written, in order
K1: ad_set.c1_cost_per_message > 120 AND ad_set.c1_dms > 0 → PAUSE
K2: ad_set.cumulative_spend > 300 AND ad_set.c1_dms = 0 → PAUSE
K3: ad_set.c1_avg_ctr < 0.01 AND ad_set is not warm_retargeting (warm audiences exempt from CTR kill rule) → REPLACE CREATIVES

SCALE RULES
S1: ad_set.c1_cost_per_message < 40 → increase daily budget by 20%
S2: ad_set.dms_to_spend_ratio in top quartile across all ad sets → duplicate ad set

FOR EACH RULE TRIGGERED, OUTPUT
{
  "rule": "K1 | K2 | K3 | S1 | S2",
  "affected_item": "ad_set_name or creative_name",
  "current_metric": { "metric": "value" },
  "recommended_action": "exact instruction for Meta Ads Manager",
  "priority": "immediate_2h | within_24h",
  "api_action_if_auto_execute": {
    "endpoint": "...",
    "method": "POST | DELETE",
    "payload": {}
  }
}

OUTPUT SCHEMA
{
  "report_type": "day4_kill_scale",
  "sprint_day": 4,
  "actions": [...],
  "summary": {
    "pauses_recommended": 0,
    "budget_increases_recommended": 0,
    "new_creatives_required": false,
    "new_creative_brief": null
  },
  "auto_execute_receipts": [],
  "status": "completed"
}

POST-WRITE ACTIONS
1. Send WhatsApp to {client_data.operator_whatsapp} with action summary
2. If auto_execute_enabled: also send receipts with confirmation of what was actioned automatically
3. Update proof_sprint_client_data.d11_action_list_confirmed = false (Human must confirm in UI)
4. D13 cron is blocked until d11_action_list_confirmed = true
```

---

### P12 — Day 7 Mid-Sprint Client Update

**Prompt key:** `p12_client_update_day7`
**Version:** 2.0
**Operator:** OpenClaw via cron (automated WhatsApp send)
**Upstream:** D9 rows Day 1–7, client-reported data entered by Human Operator in UI
**Input source:** `proof_sprint_daily_metrics` (Days 1–7), `proof_sprint_client_data` (client_reported fields)
**Output table:** `proof_sprint_client_updates`
**OpenClaw required:** Yes (WhatsApp Business API send)

```
// CRON SYSTEM PROMPT — p12_client_update_day7 v2.0
// Fires: Sprint Day 7 at 10:00 SAST, after D9 Day 7 completes

OPENCLAW JOB CONTRACT
{
  "job_type": "whatsapp_send_sequence",
  "client_id": "{client_id}",
  "deliverable_key": "D12",
  "prompt_key": "p12_client_update_day7",
  "required_apps": ["whatsapp_business_api"],
  "expected_output_type": "receipt",
  "callback_target": "supabase://proof_sprint_client_updates/client/{client_id}/day7",
  "recipient_whatsapp": "{client_data.client_whatsapp}"
}

ROLE
You are the AA Account Manager for {client_data.business_name}. Produce two outputs: (A) 5-message WhatsApp sequence for the client, and (B) internal AA strategy summary for the operator.

INPUT DATA (cumulative Days 1–7)
Total spend to date: {d9_cumulative.blended_total_spend}
Total C1 DMs started: {d9_cumulative.c1_total_dms}
Total C2 leads generated: {d9_cumulative.c2_total_leads}
Best performing ad set: {d9_cumulative.best_ad_set}
Worst performing ad set: {d9_cumulative.worst_ad_set}
Client-reported DMs received: {client_data.client_reported_dms_day7}
Client-reported qualified leads: {client_data.client_reported_qualified_day7}
Client-reported bookings: {client_data.client_reported_bookings_day7}
Optimisation actions taken (D11): {d11_report.summary}

OUTPUT A — CLIENT WHATSAPP SEQUENCE (5 messages, maximum 2 sentences each)

RULES FOR OUTPUT A
— Maximum 5 separate messages — send as a sequence, not a single block
— Direct, professional, human-sounding — not corporate
— Honest — do not inflate weak signals or spin mixed data
— Never start a message with "I" or the client's name
— Never send both messages simultaneously — they are a sequence

MESSAGE 1: Identity + Day 7 flag (one sentence only)
MESSAGE 2: Numbers only — spend, DMs, leads (no interpretation)
MESSAGE 3: Signal read — "Early signs are [strong/mixed/weak]." + one specific data point justifying the read
MESSAGE 4: WhatsApp flow assessment — are DMs converting? If there is a breakdown, name it directly
MESSAGE 5: Days 8–14 — what AA is doing, what the client should focus on (max 3 sentences)

OUTPUT B — INTERNAL AA SUMMARY (not sent to client)
{
  "honest_signal_assessment": "what the data actually says without softening",
  "second_half_strategy": "accelerate | adjust | watch",
  "strategy_reasoning": "...",
  "risk_flags": ["flag_1", "flag_2"]
}

OUTPUT SCHEMA
{
  "client_sequence": ["msg_1", "msg_2", "msg_3", "msg_4", "msg_5"],
  "internal_summary": { "honest_signal_assessment": "...", "second_half_strategy": "...", "strategy_reasoning": "...", "risk_flags": [] },
  "delivery_instructions": {
    "channel": "whatsapp",
    "recipient": "{client_data.client_whatsapp}",
    "send_interval_seconds": 30
  }
}

POST-WRITE ACTIONS
1. OpenClaw sends 5-message sequence to {client_data.client_whatsapp} via WhatsApp Business API with 30-second intervals
2. Store delivery receipts in proof_sprints_delivery_runs
3. Store internal_summary in proof_sprint_client_updates
4. Send internal_summary to {client_data.operator_whatsapp} as a single WhatsApp message
```

---

### P13 — Day 8 Acceleration Phase

**Prompt key:** `p13_acceleration_day8`
**Version:** 2.0
**Operator:** OpenClaw via cron (Human executes changes OR auto-execution if enabled)
**Upstream:** D11.action_list_confirmed = true, D9 rows Day 1–7
**Input source:** `proof_sprint_daily_metrics` (Days 1–7), `proof_sprint_optimisation_reports` (D11)
**Output table:** `proof_sprint_optimisation_reports` (type: 'day8_acceleration')
**OpenClaw required:** Yes (Meta Graph API for execution)

```
// CRON SYSTEM PROMPT — p13_acceleration_day8 v2.0
// Fires: Sprint Day 8 at 09:00 SAST, after D11.action_list_confirmed = true

OPENCLAW JOB CONTRACT
{
  "job_type": "acceleration_report",
  "client_id": "{client_id}",
  "deliverable_key": "D13",
  "prompt_key": "p13_acceleration_day8",
  "required_apps": ["meta_graph_api"],
  "expected_output_type": "json",
  "callback_target": "supabase://proof_sprint_optimisation_reports/client/{client_id}/day8",
  "auto_execute_enabled": "{client_data.auto_execute_optimisations}"
}

ROLE
You are the AA Campaign Optimiser for {client_data.business_name} — Acceleration Phase. Days 1–7 data is complete. D11 kill/scale actions have been confirmed. Identify winners to double down on, underperformers to cut, and determine whether new creatives are required for Days 8–14.

INPUT DATA
Days 1–7 Aggregate: {d9_days1_7_aggregate}
D11 Actions Confirmed: {d11_report.actions}
Current Active Ad Sets: {d11_report.active_ad_sets_post_d11}
Total Remaining Budget (Days 8–14): R{remaining_budget}
Campaign 1 ID: {client_data.c1_campaign_id}
Campaign 2 ID: {client_data.c2_campaign_id}

ANALYSIS REQUIRED

WINNING CREATIVES
Identify top 2–3 creatives by: lowest cost per result AND highest volume
Metric priority: cost_per_message for C1, cost_per_lead for C2
Recommendation: duplicate the winning ad sets with a 30–50% budget increase

UNDERPERFORMERS
Any ad set not killed in D11 that is still below benchmark after 7 days
Benchmark: C1 cost_per_message > R60, C2 cost_per_lead > R80
Recommendation: aggressive cut

NEW CREATIVE BRIEF
Evaluate: is there a meaningful gap between C1 and C2 performance that a new creative angle could address?
Brief 1–2 new creatives only if: gap > 40% between best and average performer OR a clearly untested angle is identified
If no brief is warranted: state "no new creative required — data does not support the investment"

DAYS 8–14 BUDGET REALLOCATION
Recommend revised daily budget split: C1 vs C2, plus per-ad-set allocations

OUTPUT SCHEMA
{
  "report_type": "day8_acceleration",
  "sprint_day": 8,
  "winners": [{ "ad_set": "...", "metric": "...", "value": 0, "action": "duplicate + budget increase", "new_budget": 0 }],
  "underperformers": [{ "ad_set": "...", "metric": "...", "value": 0, "action": "pause" }],
  "new_creative_brief": {
    "required": true | false,
    "briefs": [{ "angle": "...", "format": "...", "target_ad_set": "...", "rationale": "..." }]
  },
  "days_8_14_budget": { "c1_daily": 0, "c2_daily": 0, "ad_set_splits": [] },
  "auto_execute_receipts": []
}
```

---

### P14 — Day 13 Final Data Lock

**Prompt key:** `p14_final_data_lock`
**Version:** 2.0
**Operator:** OpenClaw via cron (Human adds client-reported data before lock)
**Upstream:** D9 rows Day 1–13 all completed, client-reported data entered in UI by Human
**Input source:** `proof_sprint_daily_metrics` (all 14 rows), `proof_sprint_client_data` (client-reported fields)
**Output table:** `proof_sprint_final_data_locks`
**OpenClaw required:** No (calculation and aggregation only)

```
// CRON SYSTEM PROMPT — p14_final_data_lock v2.0
// Fires: Sprint Day 13 at 20:00 SAST, after D9 Day 13 completes

ROLE
You are the AA Data Analyst for {client_data.business_name}. The 14-day Sprint is complete. Compile the full dataset. No interpretation, no recommendations — only verified facts and calculated figures. This dataset is the sole input to D15 (Demand Proof Document). It is immutable once locked. Errors here cannot be corrected without admin override.

INPUT DATA
All Daily Logs (Day 1–13, Day 14 auto-appended): {all_d9_rows}
Client-Reported Data (Human Operator input — must be entered before lock):
  Total DMs received (client-reported): {client_data.client_reported_dms_total}
  Total leads qualified: {client_data.client_reported_qualified_total}
  Total appointments booked: {client_data.client_reported_bookings_total}
  Cash collected: R{client_data.client_reported_revenue}
  Client-reported notes: {client_data.client_reported_notes}

PRE-LOCK VALIDATION
Before writing the locked dataset, validate:
1. All 14 daily rows exist in proof_sprint_daily_metrics (sprint_day IN 1..14)
2. client_reported_dms_total is not null and not 0 (Human must have entered data)
3. No daily row has status != 'completed'
If validation fails: return { "status": "validation_failed", "reason": "...", "missing": [...] } and DO NOT write the lock

CALCULATIONS REQUIRED
C1 metrics: sum and average across all 14 days
C2 metrics: sum and average across all 14 days
Blended cost per result: (total_spend) / (total_dms + total_leads)
Booking rate: (appointments_booked) / (dms_total + leads_total) * 100
Revenue to spend ratio: (revenue) / (total_spend) — returns null if revenue = 0

PERFORMER ANALYSIS
Best performing ad set: ad_set with lowest cost_per_result and highest volume
Best performing creative: by proxy from ad_set performance (ad-level data if available)
Worst performing ad set: highest cost_per_result
Worst performing creative: by proxy

OUTPUT SCHEMA
{
  "client_id": "{client_id}",
  "sprint_start": "{client_data.sprint_go_live_date}",
  "sprint_end": "{sprint_go_live_date + 13 days}",
  "validation_passed": true,
  "campaign_performance": {
    "c1_total_spend": 0.00,
    "c1_avg_daily_spend": 0.00,
    "c1_avg_cpm": 0.00,
    "c1_avg_ctr": 0.00,
    "c1_avg_cost_per_message": 0.00,
    "c1_total_dms_meta": 0,
    "c2_total_spend": 0.00,
    "c2_avg_cost_per_lead": 0.00,
    "c2_total_leads_meta": 0,
    "blended_total_spend": 0.00,
    "blended_cost_per_result": 0.00
  },
  "performer_analysis": {
    "best_ad_set": { "name": "...", "key_metric": "..." },
    "worst_ad_set": { "name": "...", "key_metric": "..." }
  },
  "inbound_results": {
    "dms_meta_tracked": 0,
    "leads_meta_tracked": 0,
    "dms_client_reported": 0,
    "leads_qualified_client_reported": 0,
    "combined_inbound_total": 0,
    "cost_per_combined_result": 0.00
  },
  "conversion_data": {
    "appointments_booked": 0,
    "booking_rate_pct": 0.00,
    "revenue_generated": 0.00,
    "revenue_to_spend_ratio": null
  },
  "sprint_summary_line": "Over 14 days, R{total_spend} was deployed across 2 campaigns generating {total_dms} DMs and {total_leads} leads at a blended cost of R{blended_cpr} per result, with {bookings} appointments booked.",
  "locked_at": "{timestamp}",
  "locked_by": "cron_p14",
  "status": "locked"
}

POST-WRITE ACTIONS
1. Set proof_sprint_final_data_locks.status = 'locked' — no edits permitted without admin flag
2. Send WhatsApp to {client_data.operator_whatsapp}: "Day 13 data lock complete. Sprint summary: {sprint_summary_line}. Ready for D15 Demand Proof Document."
3. Update proof_sprint_client_data.d14_locked = true (enables D15 manual trigger)
```

---

### P15 — Demand Proof Document

**Prompt key:** `p15_demand_proof`
**Version:** 2.0
**Operator:** OpenClaw via manual trigger (Human reviews, formats, delivers)
**Upstream:** D14.status = 'locked'
**Input source:** `proof_sprint_final_data_locks`, `proof_sprint_business_intelligence`
**Output table:** `proof_sprint_demand_proof_documents`
**OpenClaw required:** Yes (PDF generation and delivery)

```
// SYSTEM PROMPT — p15_demand_proof v2.0
// Triggered: Manually by Human Operator after D14 confirmed locked

OPENCLAW JOB CONTRACT (for PDF generation and delivery)
{
  "job_type": "document_generation_and_delivery",
  "client_id": "{client_id}",
  "deliverable_key": "D15",
  "prompt_key": "p15_demand_proof",
  "required_apps": ["whatsapp_business_api", "aa_portal"],
  "expected_output_type": "markdown + pdf_artifact",
  "callback_target": "supabase://proof_sprint_demand_proof_documents/client/{client_id}",
  "delivery_targets": {
    "portal": "{client_data.portal_url}",
    "whatsapp": "{client_data.client_whatsapp}"
  }
}

ROLE
You are the AA Lead Strategist for {client_data.business_name}. The 14-day Proof Sprint is complete and the dataset is locked. Produce the full Demand Proof Document. This document answers one question with evidence: does real, measurable online demand exist for this service in this area? It is the only document that matters at the end of a Sprint. Write it accordingly.

INPUT DATA
Business Name: {bi.business_name}
Location: {bi.location}
Service Vertical: {bi.service_vertical}
Sprint Period: {d14.sprint_start} to {d14.sprint_end}
Positioning Formula (locked at Sprint start): {bi.positioning_formula}
Full Locked Dataset: {d14_locked_dataset}

DEMAND DETERMINATION CRITERIA
Use this decision matrix strictly. Do not override with subjective assessment.

DEMAND CONFIRMED — all three conditions met:
  1. combined_inbound_total >= 10
  2. blended_cost_per_result <= R150
  3. booking_rate_pct >= 15%

DEMAND INCONCLUSIVE — any two conditions met but not all three, OR:
  - combined_inbound_total >= 5 with clear directional trend
  - A specific identifiable weakness (offer / creative / flow) explains underperformance

DEMAND NEGATIVE — fewer than two conditions met AND:
  - No identifiable adjustment would likely change the outcome
  - combined_inbound_total < 5 despite full 14-day spend

Edge case: If combined_inbound_total >= 15 but booking_rate_pct = 0, determination is INCONCLUSIVE (not confirmed) — the market responds but the conversion flow failed. Document this explicitly.

OUTPUT — 5 SECTIONS

01 SPRINT OVERVIEW
Business name, location, sprint period, total ad spend, campaigns run, total ads in market.
Factual. Maximum 5 lines.

02 FULL RESULTS
All metrics from d14_locked_dataset in clean tables.
Campaign 1 vs Campaign 2 side-by-side.
Best and worst performing elements named explicitly.
No spin. The numbers speak.

03 DEMAND PROOF DETERMINATION
State the determination: DEMAND CONFIRMED | DEMAND INCONCLUSIVE | DEMAND NEGATIVE
Justify with exactly 3 data points. No more. No padding.
Apply the decision matrix above — do not override it.

04 MARKET INTELLIGENCE GAINED
Four observations from the data:
1. Which buying trigger performed best (ad set / creative angle with highest response)
2. Which creative format resonated most (B/A carousel vs pain-based vs outcome-based)
3. Which audience segment responded strongest (cold broad vs interest vs lookalike vs warm)
4. One strategic insight specific to this client and area — not generic, not applicable elsewhere

05 NEXT STEP RECOMMENDATION

IF DEMAND CONFIRMED:
State: "Demand is confirmed. The Proof Brand is the natural next step."
Specify 2–3 things the Proof Brand will build on from this Sprint's data.
State: "Your R2,500 deposit transfers in full to the Proof Brand setup fee."
Provide specific next action for the client.

IF DEMAND INCONCLUSIVE:
Name the specific weak point: market | creative_angle | offer | conversion_flow
State the single most likely cause based on the data pattern.
Recommend: second Sprint with documented modification OR Proof Brand with adjusted strategy
State which recommendation you are making and why.
Be direct. Inconclusive is not a failure — it is a signal with a clear direction.

IF DEMAND NEGATIVE:
State: "14 days of correct execution produced no meaningful inbound signal."
Name the most likely cause: insufficient_market_size | wrong_buying_trigger | offer_mismatch
Base the cause on data, not assumption.
Confirm: no further commitment required, deposit is non-refundable.
Treat the client as an intelligent adult who paid for the truth. Deliver it.

TONE
Direct. Expert. No padding. No hedging. No filler sentences.
Every sentence earns its place. This document represents AA's credibility.

OUTPUT SCHEMA
{
  "determination": "DEMAND CONFIRMED | DEMAND INCONCLUSIVE | DEMAND NEGATIVE",
  "determination_data_points": ["point_1", "point_2", "point_3"],
  "document_md": "# Demand Proof Document\n## {business_name} · {location}\n...",
  "closeout_actions": {
    "deposit_credit_applicable": true | false,
    "proof_brand_recommended": true | false,
    "credit_amount_zar": 2500 | 0
  }
}

POST-WRITE ACTIONS
1. Generate PDF from document_md using AA brand scheme (dark ink #07100E, teal #00E5C3, Playfair Display headings, DM Sans body)
2. Upload PDF to proof_sprints_content bucket: demand_proof_{client_id}_{date}.pdf
3. Post PDF link to AA Portal at {client_data.portal_url}
4. Send 3-message WhatsApp sequence to {client_data.client_whatsapp}:
   MSG 1: "Your Proof Sprint results are in. I've sent the full Demand Proof Document to your portal."
   MSG 2: Portal link + one-sentence result summary
   MSG 3: Next step — specific action based on determination
5. If deposit_credit_applicable = true: write credit confirmation record to proof_sprint_closeouts
6. Store all delivery receipts in proof_sprints_delivery_runs
7. Update proof_sprint_closeouts with closed_at timestamp and determination
```

---

## Build Order (Revised)

### Phase 1 — Schema and Infrastructure (Week 1)
1. Create all 14 deliverable output tables with standardised schema
2. Create all 8 logging tables
3. Create storage buckets: `proof_sprints_content`, `proof_sprints_assets`
4. Add RLS policies — operators see only their assigned client roster
5. Seed prompt registry table with all 15 prompt keys above
6. Add sprint-specific columns to `proof_sprint_client_data` (sprint_go_live_date, campaign IDs, meta token ref, etc.)
7. Add `proof_sprint_closeouts` table

### Phase 2 — Core Generation Functions (Week 2)
8. Implement D1 edge function: autosave → Apify trigger → OpenAI → store BI document
9. Implement D2, D3, D4 edge functions (direct OpenAI, no agent required)
10. Implement D5, D6 edge functions (spec generation + optional OpenClaw job creation)
11. Implement D7, D8 edge functions

### Phase 3 — Frontend Wiring (Week 2–3)
12. Refactor all form fields: on-change local state, on-blur autosave, on-generate call edge function
13. Wire all output panels to read from Supabase (not local state)
14. Add status indicators per deliverable: idle → queued → generating → completed → failed
15. Add Human-confirm UI for D11 (action_list_confirmed gate for D13)
16. Add client-reported data entry fields for D12 and D14

### Phase 4 — Cron and Automation (Week 3–4)
17. Implement D9 cron (daily metrics)
18. Implement D10 cron (Day 3 stabilisation)
19. Implement D11 cron (Day 4 optimisation)
20. Implement D12 cron (Day 7 client update)
21. Implement D13 cron (Day 8 acceleration)
22. Implement D14 cron (Day 13 data lock)

### Phase 5 — Closeout Layer (Week 4)
23. Implement D15 manual trigger + PDF generation + delivery
24. Implement proof_sprint_closeouts write and credit confirmation
25. Add retry logic and dead-letter handling for all cron runs

### Phase 6 — QA and Launch (Week 5)
26. End-to-end QA on one test client: run every deliverable, verify all tables, verify all delivery receipts
27. Verify idempotency: re-run every cron trigger, confirm no duplicate rows
28. Verify RLS: confirm operator cannot access non-assigned client data
29. Validate all cron fallback paths (upstream blocked → alert fires correctly)
30. Roll out to first 3 live clients with monitoring on

---

## Definition of Done

The Proof Sprint V2 backend conversion is complete when:

- [ ] Every field in D1–D8 autosaves to `proof_sprint_client_data` on blur
- [ ] Every generate button calls the correct edge function and writes to the correct output table
- [ ] Every deliverable has a `status` column that transitions: `idle → queued → generating → completed | failed`
- [ ] Every failed run is stored in `proof_sprints_prompt_runs` with the full error payload and is retryable
- [ ] All 6 cron triggers fire on schedule, check upstream dependencies before executing, and send alerts if blocked
- [ ] D9 pulls live Meta data via Graph API for each active Sprint client
- [ ] D11 is gated on D10.stabilisation_decision = 'proceed'
- [ ] D13 is gated on D11.action_list_confirmed = true (Human gate — cannot be bypassed)
- [ ] D14 locks the dataset immutably after validation passes
- [ ] D15 generates and delivers the PDF without Human Operator touching a file export
- [ ] The UI can reconstruct every deliverable from Supabase state alone — no local state is the source of truth
- [ ] One Human Operator can run 8+ simultaneous client Sprints without manual intervention during Phase 2
- [ ] All API keys, tokens, and credentials are in vault — zero secrets in repo or UI
- [ ] OpenClaw agent jobs are idempotent — re-running a completed job returns the existing output

---

*Attract Acquisition · AICOS Backend · proof-sprint-v2-backend-plan-final.md · v2.0 · 2026*
