# Proof Sprint V2 Backend Conversion Plan

## 1) Goal
Convert the current Proof Sprint V2 front end from a static operator dashboard into a real workflow engine backed by Supabase, OpenAI, and OpenClaw.

The system must:
- persist every client input to Supabase
- generate every deliverable server-side
- store every generated artifact with a client UUID
- log every AI / API run
- trigger cron-based phase 2 deliverables automatically
- keep the front end as the operator control panel, not the source of truth

## 2) Core architecture
Use three layers:

1. **Presentation layer**
   - `src/pages/ProofSprintV2.tsx`
   - the tabbed UI stays, but fields become write-through inputs
   - buttons become calls to backend functions
   - outputs are read from Supabase, not local state only

2. **Orchestration layer**
   - Supabase Edge Functions
   - prompt template registry
   - OpenClaw job dispatch for cron / external actions
   - OpenAI calls for all generated content

3. **Persistence layer**
   - client input tables
   - deliverable output tables
   - artifact buckets
   - run logs / delivery receipts / alert logs

## 3) Canonical workflow rules
- One client = one `client_id` UUID
- Every deliverable writes a versioned row to a dedicated table
- Every generation run stores:
  - prompt key
  - model used
  - input snapshot
  - output markdown
  - raw provider response
  - artifact paths
  - status
  - timestamps
- All external actions must be idempotent
- The UI should always be reconstructable from Supabase state alone
- If a run fails, it must be retryable without duplicating side effects

## 4) Current Proof Sprint V2 front-end map
The page is already structured as 15 operator tabs. Backend work should map to them as follows:

### Phase 1, build phase
- **D1** Tools, Information, Assets
- **D2** Before / After Proof Ads
- **D3** Ad Variants
- **D4** Lead Magnet
- **D5** Meta Conversion Campaign
- **D6** Meta Leads Campaign
- **D7** WhatsApp DM Qualifier Script
- **D8** WhatsApp Conversion Flow Setup

### Phase 2, live sprint phase
- **D9** Daily Sprint Metrics Engine
- **D10** Day 3 Stabilisation Protocol
- **D11** Day 4 Optimisation Report
- **D12** Day 7 Mid-Sprint Client Update
- **D13** Day 8 Acceleration Phase
- **D14** Day 13 Final Data Lock
- **D15** Demand Proof Document

Note: the business process map in the HTML source treats the closeout as a 14-step journey. If the app keeps the separate D15 UI tab, backend should treat D14 and D15 as the closeout layer of the same canonical end-stage.

## 5) Required Supabase schema
Create or formalize these tables.

### Core input table
**`proof_sprint_client_data`**
Stores the live editable client intake and working state.
Suggested columns:
- `id`
- `client_id`
- `deliverable_key`
- `input_json`
- `status`
- `created_at`
- `updated_at`
- `created_by`

This table should hold the current operator state for D1-D8 inputs and the base data needed by D9-D15.

### Deliverable output tables
Create a separate table for each generated output family:
- `proof_sprint_business_intelligence`
- `proof_sprint_proof_ads`
- `proof_sprint_ad_variants`
- `proof_sprint_lead_magnets`
- `proof_sprint_campaign_specs`
- `proof_sprint_whatsapp_scripts`
- `proof_sprint_manychat_flows`
- `proof_sprint_daily_metrics`
- `proof_sprint_stabilisation_reports`
- `proof_sprint_optimisation_reports`
- `proof_sprint_client_updates`
- `proof_sprint_acceleration_reports`
- `proof_sprint_final_data_locks`
- `proof_sprint_demand_proof_documents`

Use the same pattern in each table:
- `id`
- `client_id`
- `deliverable_key`
- `version`
- `prompt_key`
- `model`
- `input_json`
- `output_md`
- `output_json`
- `artifact_paths`
- `status`
- `error_message`
- `run_id`
- `created_at`
- `updated_at`

### Logging tables
Create logging tables for observability and retries:
- `proof_sprints_prompt_runs`
- `proof_sprints_delivery_runs`
- `proof_sprints_content_logs`
- `proof_sprints_alert_events`
- `proof_sprints_external_receipts`

These should capture provider payloads, Telegram responses, Meta / WhatsApp receipts, and cron run metadata.

## 6) Storage buckets
Use buckets deliberately:

- **`proof_sprints_content`**
  - generated markdown files
  - PDFs
  - AI returned images
  - Telegram-returned media
  - exported prompt artifacts

- **`proof_sprints_assets`** or existing client asset bucket
  - raw client uploads
  - before / after images
  - source PDFs / brand files

Keep raw uploads separate from generated outputs if possible.

## 7) Prompt registry
Do not hardcode prompts inside front-end code.

Create a prompt registry table or versioned file set containing:
- prompt key
- prompt version
- system prompt text
- user prompt template
- variable schema
- model preference
- temperature / response format
- active flag

Required prompt keys:
- `p01_bi_positioning`
- `p02_frame3_copy`
- `p03_ad_variants`
- `p04_lead_magnet`
- `p05_meta_conversion_campaign`
- `p06_meta_leads_campaign`
- `p07_whatsapp_qualifier`
- `p08_manychat_flow`
- `p09_daily_metrics`
- `p10_stabilisation`
- `p11a_optimisation_day4`
- `p11b_acceleration_day8`
- `p12_client_update_day7`
- `p13_final_data_lock`
- `p14_demand_proof`

## 8) Edge function architecture
Create one backend entrypoint per deliverable family.

Recommended function names:
- `proof-sprint-generate-bi`
- `proof-sprint-generate-proof-ads`
- `proof-sprint-generate-ad-variants`
- `proof-sprint-generate-lead-magnet`
- `proof-sprint-generate-meta-conversion`
- `proof-sprint-generate-meta-leads`
- `proof-sprint-generate-whatsapp-script`
- `proof-sprint-generate-manychat-flow`
- `proof-sprint-daily-metrics`
- `proof-sprint-stabilisation`
- `proof-sprint-optimisation`
- `proof-sprint-client-update`
- `proof-sprint-acceleration`
- `proof-sprint-final-data-lock`
- `proof-sprint-demand-proof`

Every function should:
1. verify auth and client permissions
2. load the client row and required prior deliverables
3. build the prompt payload from the registry
4. call OpenAI or OpenClaw
5. normalize the response to markdown / JSON
6. store the result in the correct table
7. upload generated files to the bucket
8. create a run log row
9. return the latest output to the UI

## 9) Deliverable-by-deliverable implementation map

### D1, Tools, Information & Assets
Purpose:
- capture the raw business intake
- save assets, links, transcripts, app credentials, and competitor context

Backend steps:
- autosave every field to `proof_sprint_client_data`
- upload client files to storage
- on Generate, read the saved client row
- combine it with competitor data and Prompt 01
- call OpenAI
- save the markdown to `proof_sprint_business_intelligence`
- write the output path and version to the log table

UI behavior:
- show autosave state
- show generation status
- display the markdown result from Supabase

### D2, Before / After Proof Ads
Purpose:
- combine D1 positioning with before / after images and generate Frame 3 copy

Backend steps:
- pull `proof_sprint_business_intelligence`
- combine with Prompt 02
- generate the copy variants with OpenAI
- save copy to `proof_sprint_proof_ads`
- send the copy plus before / after images to Telegram
- capture Telegram response ids, returned file ids, and any generated media
- store returned media in `proof_sprints_content`
- log the entire delivery payload and response

UI behavior:
- let the operator select source assets
- show stored ad copy
- display delivery receipts and any asset references

### D3, Ad Variants
Purpose:
- produce pain, outcome, and offer copy sets for AdCreative.ai

Backend steps:
- pull D1 outputs
- combine with Prompt 03
- generate the 6 copy items
- save to `proof_sprint_ad_variants`
- mark warm-audience-only output for offer-based copy
- optionally queue an OpenClaw / AdCreative task for later automation

UI behavior:
- show the generated copy groups
- allow copy / export labels

### D4, Lead Magnet
Purpose:
- create the lead magnet topic, PDF copy, CTA, and form spec

Backend steps:
- pull D1 position and vertical data
- combine with Prompt 04
- generate the lead magnet markdown
- save to `proof_sprint_lead_magnets`
- create PDF and store artifact
- save form spec for the Meta instant form build

### D5, Meta Conversion Campaign
Purpose:
- generate the campaign 1 build sheet for WhatsApp traffic

Backend steps:
- pull D1 positioning plus D3 creative intent
- combine with Prompt 05
- generate the campaign structure
- save to `proof_sprint_campaign_specs`
- store ad set targeting, exclusions, budgets, keyword trigger, and approval notes

### D6, Meta Leads Campaign
Purpose:
- generate campaign 2, the leads / instant form campaign

Backend steps:
- pull D1 and D4 outputs
- combine with Prompt 06
- generate the leads campaign build sheet
- save to the same campaign table or a dedicated `proof_sprint_leads_campaign_specs`
- store audience split, lead form spec, and budget guidance

### D7, WhatsApp DM Qualifier Script
Purpose:
- generate the six-message WhatsApp qualification flow

Backend steps:
- pull D1 positioning and D5 keyword trigger
- combine with Prompt 07
- generate the message sequence
- save to `proof_sprint_whatsapp_scripts`
- keep copy versioned by client and sprint run

### D8, WhatsApp Conversion Flow Setup
Purpose:
- generate the ManyChat / WhatsApp branching logic

Backend steps:
- pull D5 keyword trigger and D7 script
- combine with Prompt 08
- generate the flow tree and QA checklist
- save to `proof_sprint_manychat_flows`
- optionally generate a deployable JSON mapping for ManyChat import

### D9, Daily Sprint Metrics Engine
Purpose:
- fully automate daily metric pulls and alerting

Backend steps:
- create a daily cron job at 08:00 SAST
- connect Meta Graph API, AA Dashboard, and OpenClaw
- pull spend, CPM, CTR, cost per message, cost per lead, DMs, and leads
- write a daily row to `proof_sprint_daily_metrics`
- evaluate kill / scale thresholds
- create alerts in `proof_sprints_alert_events`
- send alerts to WhatsApp / Telegram only when thresholds are breached
- keep Days 1-3 as stabilisation-only review mode

### D10, Day 3 Stabilisation Protocol
Purpose:
- lock down the early data before optimisation begins

Backend steps:
- run at the end of Day 3
- pull the first three days from `proof_sprint_daily_metrics`
- generate the stabilisation report with Prompt 10
- save to `proof_sprint_stabilisation_reports`
- mark whether the sprint is stable enough to continue
- surface critical flags to the operator in the UI

### D11, Day 4 Optimisation Report and Day 8 Acceleration
Purpose:
- decide what to pause, scale, duplicate, or rebuild

Backend steps:
- implement two sub-runs:
  - **11a Day 4 kill / scale report**
  - **11b Day 8 acceleration report**
- Day 4 run uses Days 1-3 data and Prompt 11a
- Day 8 run uses Days 1-7 cumulative data and Prompt 11b
- save both outputs to `proof_sprint_optimisation_reports`
- log the action list the operator must execute in Meta Ads Manager

### D12, Day 7 Mid-Sprint Client Update
Purpose:
- send the client a progress update while the sprint is live

Backend steps:
- run on Day 7 after the daily metrics job
- pull cumulative data and client-reported leads / bookings
- generate the WhatsApp update with Prompt 12
- send to the client via WhatsApp Business API
- store message content and delivery receipt in `proof_sprints_delivery_runs`
- save the internal summary to `proof_sprint_client_updates`

### D13, Day 13 Final Data Lock
Purpose:
- freeze the final sprint dataset before closeout

Backend steps:
- run end of Day 13
- pull all 14 daily logs plus manual client-reported results
- aggregate totals, averages, booking rates, and revenue-to-spend ratio
- save the locked dataset to `proof_sprint_final_data_locks`
- mark the data as immutable unless an admin override occurs

### D14, Demand Proof Document
Purpose:
- generate the final proof document and delivery pack

Backend steps:
- read the locked D13 dataset plus the original positioning formula
- run Prompt 14
- generate the markdown and PDF
- save to `proof_sprint_demand_proof_documents`
- upload PDF to `proof_sprints_content`
- deliver the portal link and WhatsApp summary to the client
- if demand is confirmed, create the credit confirmation record

### D15, Closeout Layer if the UI keeps it
Purpose:
- handle final confirmation, portal delivery confirmation, and engagement close

Backend steps:
- if the app keeps D15 as a separate tab, treat it as a closeout state
- store closeout metadata in a lightweight `proof_sprint_closeouts` table
- record whether the engagement is closed, credit confirmed, and handoff completed
- if the product team later merges D15 into D14, this table can be removed without changing the workflow logic

## 10) Front-end integration rules
Refactor the front-end so every field behaves like this:

- **on change**: update local state
- **on blur / debounce**: autosave to `proof_sprint_client_data`
- **on generate**: call the relevant edge function
- **on success**: refresh the output from Supabase
- **on failure**: keep the draft state, show the error, and log the failure

Every output panel should load the latest persisted markdown from the database.

## 11) External integrations
### OpenAI
- keep the OpenAI key server-side only
- use a server wrapper so the front end never sees secrets
- prefer `gpt-5.4-mini` for routine generation
- use `gpt-5.4` for heavy synthesis, final closeout docs, or difficult prompt chains

### Telegram
- use Telegram for the D2 asset delivery path
- store every message id and file id returned by the API
- treat Telegram responses as delivery receipts

### OpenClaw
- use OpenClaw as the automation worker for cron-triggered tasks
- dispatch jobs with the client id, deliverable key, prompt key, and callback route
- keep OpenClaw jobs idempotent and resumable

### Meta / WhatsApp / ManyChat
- read from the same saved client state and prompt registry
- never hardcode campaign settings in the UI
- write live receipts back to Supabase

## 12) Observability and failure handling
Add these controls from day one:
- per-run statuses: queued, running, completed, failed, retried
- retry counts and retry backoff
- prompt version tracking
- provider error storage
- external delivery receipts
- dead-letter handling for failed cron runs
- admin-visible audit log for every output change

## 13) Security
- keep all secrets in environment variables or managed secret stores
- no API keys in the repo
- use Supabase RLS so operators only see allowed clients
- validate all payloads with a schema validator before execution
- sanitize all uploaded file names and paths
- never let the browser call OpenAI or Telegram directly

## 14) Build order
Implement in this order:

1. Create the missing tables and storage buckets
2. Add RLS policies and service-role access patterns
3. Build the prompt registry
4. Build the generic run-log schema
5. Implement D1 generation and persistence
6. Implement D2 external delivery and logging
7. Implement D3-D8 generation functions
8. Wire the front end to autosave and call edge functions
9. Implement D9-D15 cron jobs and OpenClaw dispatch
10. Add alerts, receipts, retries, and monitoring
11. Run end-to-end QA on one client
12. Roll out to a limited client set
13. Turn on automated cron delivery after validation

## 15) Definition of done
The conversion is complete when:
- every Proof Sprint V2 field is saved to Supabase
- every generate button writes to a backend table
- every deliverable is reconstructable from stored data
- the daily cron jobs run without manual intervention
- alerts, receipts, and outputs are logged
- the UI can refresh itself from persisted state only
- the sprint can be run by one operator at scale with OpenClaw + OpenAI + Supabase
