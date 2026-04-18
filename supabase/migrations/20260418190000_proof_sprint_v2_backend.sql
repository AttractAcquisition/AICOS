-- Proof Sprint V2 backend schema, logs, prompts, and storage

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Core client working state
-- -----------------------------------------------------------------------------
create table if not exists public.proof_sprint_client_data (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  deliverable_key text not null default 'D1',
  input_json jsonb not null default '{}'::jsonb,
  sprint_go_live_date date,
  sprint_day_current integer,
  c1_campaign_id text,
  c2_campaign_id text,
  meta_access_token_ref text,
  openclaw_agent_id text,
  operator_whatsapp text,
  client_whatsapp text,
  running_totals_json jsonb not null default '{}'::jsonb,
  client_reported_dms_total numeric(14,2),
  client_reported_qualified_total numeric(14,2),
  client_reported_bookings_total numeric(14,2),
  client_reported_revenue numeric(14,2),
  client_reported_notes text,
  d10_cleared boolean not null default false,
  d11_action_list_confirmed boolean not null default false,
  d14_locked boolean not null default false,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proof_sprint_client_data_client_id_idx on public.proof_sprint_client_data (client_id);
create index if not exists proof_sprint_client_data_deliverable_key_idx on public.proof_sprint_client_data (deliverable_key);
create index if not exists proof_sprint_client_data_status_idx on public.proof_sprint_client_data (status);
create unique index if not exists proof_sprint_client_data_client_deliverable_key_uidx on public.proof_sprint_client_data (client_id, deliverable_key);

-- -----------------------------------------------------------------------------
-- Prompt registry
-- -----------------------------------------------------------------------------
create table if not exists public.proof_sprint_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  version text not null,
  title text not null,
  deliverable_key text not null,
  system_prompt text not null,
  user_prompt_template text,
  upstream_dependencies text[] not null default '{}'::text[],
  output_tables text[] not null default '{}'::text[],
  openclaw_required boolean not null default false,
  cron_day integer,
  cron_time_sast text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prompt_key, version)
);

create index if not exists proof_sprint_prompt_templates_key_idx on public.proof_sprint_prompt_templates (prompt_key, active);
create index if not exists proof_sprint_prompt_templates_deliverable_idx on public.proof_sprint_prompt_templates (deliverable_key, active);

-- -----------------------------------------------------------------------------
-- Generic deliverable output tables
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'proof_sprint_business_intelligence',
    'proof_sprint_proof_ads',
    'proof_sprint_ad_variants',
    'proof_sprint_lead_magnets',
    'proof_sprint_campaign_specs',
    'proof_sprint_whatsapp_scripts',
    'proof_sprint_manychat_flows',
    'proof_sprint_stabilisation_reports',
    'proof_sprint_optimisation_reports',
    'proof_sprint_client_updates',
    'proof_sprint_acceleration_reports',
    'proof_sprint_final_data_locks',
    'proof_sprint_demand_proof_documents'
  ] LOOP
    EXECUTE format($sql$
      create table if not exists public.%I (
        id uuid primary key default gen_random_uuid(),
        client_id uuid not null references public.clients(id) on delete cascade,
        deliverable_key text not null,
        version integer not null default 1,
        prompt_key text,
        model text,
        input_json jsonb not null default '{}'::jsonb,
        output_md text,
        output_json jsonb not null default '{}'::jsonb,
        artifact_paths text[] not null default '{}'::text[],
        status text not null default 'draft',
        error_message text,
        run_id uuid,
        created_by uuid references auth.users(id) on delete set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (client_id, deliverable_key, version)
      );
    $sql$, tbl);
    EXECUTE format('create index if not exists %I_client_id_idx on public.%I (client_id);', tbl || '_client_id', tbl);
    EXECUTE format('create index if not exists %I_deliverable_key_idx on public.%I (deliverable_key);', tbl || '_deliverable_key', tbl);
    EXECUTE format('create index if not exists %I_status_idx on public.%I (status);', tbl || '_status', tbl);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Specialised D9 live metrics table
-- -----------------------------------------------------------------------------
create table if not exists public.proof_sprint_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sprint_day integer not null,
  log_date date not null,
  c1_spend numeric(14,2) not null default 0,
  c1_cpm numeric(14,2) not null default 0,
  c1_ctr numeric(8,4) not null default 0,
  c1_cost_per_message numeric(14,2) not null default 0,
  c1_dms_started integer not null default 0,
  c2_spend numeric(14,2) not null default 0,
  c2_cpm numeric(14,2) not null default 0,
  c2_ctr numeric(8,4) not null default 0,
  c2_cost_per_lead numeric(14,2) not null default 0,
  c2_leads_generated integer not null default 0,
  blended_total_spend numeric(14,2) not null default 0,
  blended_cost_per_result numeric(14,2) not null default 0,
  kill_alerts_json jsonb not null default '[]'::jsonb,
  scale_alerts_json jsonb not null default '[]'::jsonb,
  stabilisation_phase boolean not null default false,
  raw_api_response jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, sprint_day, log_date)
);

create index if not exists proof_sprint_daily_metrics_client_day_idx on public.proof_sprint_daily_metrics (client_id, sprint_day);
create index if not exists proof_sprint_daily_metrics_log_date_idx on public.proof_sprint_daily_metrics (log_date);

-- -----------------------------------------------------------------------------
-- Final closeout table (D15)
-- -----------------------------------------------------------------------------
create table if not exists public.proof_sprint_closeouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  deliverable_key text not null default 'D15',
  demand_determination text not null default 'inconclusive',
  deposit_credit_confirmed boolean not null default false,
  proof_brand_proceed boolean not null default false,
  delivery_receipt_wa text,
  delivery_receipt_portal text,
  closed_at timestamptz,
  closed_by text,
  status text not null default 'draft',
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  artifact_paths text[] not null default '{}'::text[],
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proof_sprint_closeouts_client_idx on public.proof_sprint_closeouts (client_id, created_at desc);


-- -----------------------------------------------------------------------------
-- Logging and receipts
-- -----------------------------------------------------------------------------
create table if not exists public.proof_sprints_prompt_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_key text not null,
  prompt_key text not null,
  prompt_version text,
  upstream_dependencies text[] not null default '{}'::text[],
  openclaw_required boolean not null default false,
  status text not null default 'queued',
  model text,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  output_md text,
  output_tables text[] not null default '{}'::text[],
  agent_job_id uuid,
  blocked_by text[] not null default '{}'::text[],
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proof_sprints_prompt_runs_client_idx on public.proof_sprints_prompt_runs (client_id, deliverable_key, created_at desc);
create index if not exists proof_sprints_prompt_runs_status_idx on public.proof_sprints_prompt_runs (status);

create table if not exists public.proof_sprints_delivery_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_key text,
  channel text not null,
  recipient text,
  message_json jsonb not null default '{}'::jsonb,
  receipt_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proof_sprints_delivery_runs_client_idx on public.proof_sprints_delivery_runs (client_id, created_at desc);

create table if not exists public.proof_sprints_content_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_key text,
  bucket text not null,
  object_path text not null,
  artifact_kind text,
  mime_type text,
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'created',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create table if not exists public.proof_sprints_alert_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_key text,
  severity text not null default 'info',
  alert_type text not null,
  alert_json jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_sprints_external_receipts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_key text,
  provider text not null,
  receipt_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proof_sprints_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_key text not null,
  prompt_key text not null,
  prompt_version text,
  idempotency_key text not null,
  required_apps text[] not null default '{}'::text[],
  input_artifact_paths text[] not null default '{}'::text[],
  callback_target text,
  expected_output_type text not null default 'json',
  telegram_chat_id text,
  telegram_message_id text,
  openclaw_agent_id text,
  payload_json jsonb not null default '{}'::jsonb,
  receipt_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  retry_allowed boolean not null default true,
  max_retries integer not null default 3,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists proof_sprints_agent_jobs_client_idx on public.proof_sprints_agent_jobs (client_id, deliverable_key, created_at desc);
create index if not exists proof_sprints_agent_jobs_status_idx on public.proof_sprints_agent_jobs (status);

create table if not exists public.proof_sprints_agent_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.proof_sprints_agent_jobs(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  event_type text not null,
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.proof_sprints_agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.proof_sprints_agent_jobs(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  deliverable_key text,
  bucket text,
  object_path text,
  public_url text,
  artifact_kind text,
  metadata_json jsonb not null default '{}'::jsonb,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Storage buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('proof_sprints_content', 'proof_sprints_content', true),
  ('proof_sprints_assets', 'proof_sprints_assets', false)
on conflict (id) do update set name = excluded.name, public = excluded.public;

-- Public read on generated content, authenticated uploads for assets.
drop policy if exists "proof_sprints_content_select" on storage.objects;
create policy "proof_sprints_content_select"
on storage.objects for select
using (bucket_id in ('proof_sprints_content', 'proof_sprints_assets'));

drop policy if exists "proof_sprints_content_insert" on storage.objects;
create policy "proof_sprints_content_insert"
on storage.objects for insert
with check (bucket_id in ('proof_sprints_content', 'proof_sprints_assets') and auth.role() = 'authenticated');

drop policy if exists "proof_sprints_content_update" on storage.objects;
create policy "proof_sprints_content_update"
on storage.objects for update
using (bucket_id in ('proof_sprints_content', 'proof_sprints_assets') and auth.role() = 'authenticated');

drop policy if exists "proof_sprints_content_delete" on storage.objects;
create policy "proof_sprints_content_delete"
on storage.objects for delete
using (bucket_id in ('proof_sprints_content', 'proof_sprints_assets') and auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'proof_sprint_client_data',
    'proof_sprint_business_intelligence',
    'proof_sprint_proof_ads',
    'proof_sprint_ad_variants',
    'proof_sprint_lead_magnets',
    'proof_sprint_campaign_specs',
    'proof_sprint_whatsapp_scripts',
    'proof_sprint_manychat_flows',
    'proof_sprint_stabilisation_reports',
    'proof_sprint_optimisation_reports',
    'proof_sprint_client_updates',
    'proof_sprint_acceleration_reports',
    'proof_sprint_final_data_locks',
    'proof_sprint_demand_proof_documents',
    'proof_sprint_closeouts',
    'proof_sprint_daily_metrics',
    'proof_sprints_prompt_runs',
    'proof_sprints_delivery_runs',
    'proof_sprints_content_logs',
    'proof_sprints_alert_events',
    'proof_sprints_external_receipts',
    'proof_sprints_agent_jobs',
    'proof_sprints_agent_events',
    'proof_sprints_agent_artifacts'
  ] LOOP
    EXECUTE format('alter table public.%I enable row level security;', tbl);
    EXECUTE format('drop policy if exists %I_select on public.%I;', tbl, tbl);
    EXECUTE format('drop policy if exists %I_insert on public.%I;', tbl, tbl);
    EXECUTE format('drop policy if exists %I_update on public.%I;', tbl, tbl);
    EXECUTE format('drop policy if exists %I_delete on public.%I;', tbl, tbl);

    IF tbl IN ('proof_sprints_prompt_runs', 'proof_sprints_delivery_runs', 'proof_sprints_content_logs', 'proof_sprints_alert_events', 'proof_sprints_external_receipts', 'proof_sprints_agent_jobs', 'proof_sprints_agent_events', 'proof_sprints_agent_artifacts') THEN
      EXECUTE format('create policy %I_select on public.%I for select using (public.check_is_staff());', tbl, tbl);
      EXECUTE format('create policy %I_insert on public.%I for insert with check (public.check_is_staff());', tbl, tbl);
      EXECUTE format('create policy %I_update on public.%I for update using (public.check_is_staff()) with check (public.check_is_staff());', tbl, tbl);
      EXECUTE format('create policy %I_delete on public.%I for delete using (public.check_is_staff());', tbl, tbl);
    ELSE
      EXECUTE format('create policy %I_select on public.%I for select using (public.can_access_client(client_id));', tbl, tbl);
      EXECUTE format('create policy %I_insert on public.%I for insert with check (public.can_access_client(client_id));', tbl, tbl);
      EXECUTE format('create policy %I_update on public.%I for update using (public.can_access_client(client_id)) with check (public.can_access_client(client_id));', tbl, tbl);
      EXECUTE format('create policy %I_delete on public.%I for delete using (public.can_access_client(client_id));', tbl, tbl);
    END IF;
  END LOOP;
END $$;

alter table public.proof_sprint_prompt_templates enable row level security;
drop policy if exists proof_sprint_prompt_templates_select on public.proof_sprint_prompt_templates;
create policy proof_sprint_prompt_templates_select
on public.proof_sprint_prompt_templates for select
using (public.check_is_staff());

drop policy if exists proof_sprint_prompt_templates_insert on public.proof_sprint_prompt_templates;
create policy proof_sprint_prompt_templates_insert
on public.proof_sprint_prompt_templates for insert
with check (public.check_is_staff());

drop policy if exists proof_sprint_prompt_templates_update on public.proof_sprint_prompt_templates;
create policy proof_sprint_prompt_templates_update
on public.proof_sprint_prompt_templates for update
using (public.check_is_staff()) with check (public.check_is_staff());

drop policy if exists proof_sprint_prompt_templates_delete on public.proof_sprint_prompt_templates;
create policy proof_sprint_prompt_templates_delete
on public.proof_sprint_prompt_templates for delete
using (public.check_is_staff());

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'proof_sprint_client_data',
    'proof_sprint_business_intelligence',
    'proof_sprint_proof_ads',
    'proof_sprint_ad_variants',
    'proof_sprint_lead_magnets',
    'proof_sprint_campaign_specs',
    'proof_sprint_whatsapp_scripts',
    'proof_sprint_manychat_flows',
    'proof_sprint_daily_metrics',
    'proof_sprint_stabilisation_reports',
    'proof_sprint_optimisation_reports',
    'proof_sprint_client_updates',
    'proof_sprint_acceleration_reports',
    'proof_sprint_final_data_locks',
    'proof_sprint_demand_proof_documents',
    'proof_sprint_closeouts',
    'proof_sprints_prompt_runs',
    'proof_sprints_delivery_runs',
    'proof_sprints_content_logs',
    'proof_sprints_alert_events',
    'proof_sprints_external_receipts',
    'proof_sprints_agent_jobs',
    'proof_sprints_agent_events',
    'proof_sprints_agent_artifacts'
  ] LOOP
    EXECUTE format('drop trigger if exists set_updated_at on public.%I;', tbl);
    EXECUTE format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', tbl);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Seed prompt registry metadata
-- -----------------------------------------------------------------------------
insert into public.proof_sprint_prompt_templates (
  prompt_key,
  version,
  title,
  deliverable_key,
  system_prompt,
  user_prompt_template,
  upstream_dependencies,
  output_tables,
  openclaw_required,
  cron_day,
  cron_time_sast,
  active,
  notes
)
values
  ('p01_bi_positioning', '2.0', 'Business Intelligence & Positioning', 'D1', 'Seeded from final plan', null, '{}'::text[], array['proof_sprint_business_intelligence'], false, null, null, true, 'Direct OpenAI generation'),
  ('p02_frame3_copy', '2.0', 'AA Studio Frame 3 Copy', 'D2', 'Seeded from final plan', null, array['D1'], array['proof_sprint_proof_ads'], true, null, null, true, 'OpenAI draft + OpenClaw AdCreative agent'),
  ('p03_ad_variants', '2.0', 'AdCreative.ai Variant Suite', 'D3', 'Seeded from final plan', null, array['D1'], array['proof_sprint_ad_variants'], true, null, null, true, 'OpenAI draft + OpenClaw agent'),
  ('p04_lead_magnet', '2.0', 'Lead Magnet Asset', 'D4', 'Seeded from final plan', null, array['D1'], array['proof_sprint_lead_magnets'], false, null, null, true, 'Direct OpenAI generation'),
  ('p05_meta_conversion', '2.0', 'Meta Conversion Campaign', 'D5', 'Seeded from final plan', null, array['D1','D2','D3'], array['proof_sprint_campaign_specs'], true, null, null, true, 'OpenAI spec + OpenClaw Meta build job'),
  ('p06_meta_leads', '2.0', 'Meta Leads Campaign', 'D6', 'Seeded from final plan', null, array['D1','D4','D5'], array['proof_sprint_campaign_specs'], true, null, null, true, 'OpenAI spec + OpenClaw Meta build job'),
  ('p07_whatsapp_qualifier', '2.0', 'WhatsApp DM Qualifier Script', 'D7', 'Seeded from final plan', null, array['D1','D5'], array['proof_sprint_whatsapp_scripts'], false, null, null, true, 'Direct OpenAI generation'),
  ('p08_manychat_flow', '2.0', 'WhatsApp Conversion Flow', 'D8', 'Seeded from final plan', null, array['D5','D7'], array['proof_sprint_manychat_flows'], true, null, null, true, 'OpenAI spec + optional ManyChat agent job'),
  ('p09_daily_metrics', '2.0', 'Daily Sprint Metrics Engine', 'D9', 'Seeded from final plan', null, array['D5','D6'], array['proof_sprint_daily_metrics'], true, 1, '08:00', true, 'Cron-driven OpenClaw job'),
  ('p10_stabilisation', '2.0', 'Day 3 Stabilisation Protocol', 'D10', 'Seeded from final plan', null, array['D9'], array['proof_sprint_stabilisation_reports'], true, 3, '20:00', true, 'Cron-driven OpenClaw job'),
  ('p11_optimisation_day4', '2.0', 'Day 4 Optimisation Report', 'D11', 'Seeded from final plan', null, array['D9','D10'], array['proof_sprint_optimisation_reports'], true, 4, '09:00', true, 'Cron-driven OpenClaw job'),
  ('p13_acceleration_day8', '2.0', 'Day 8 Acceleration Phase', 'D13', 'Seeded from final plan', null, array['D9','D11'], array['proof_sprint_optimisation_reports'], true, 8, '09:00', true, 'Cron-driven OpenClaw job'),
  ('p12_client_update_day7', '2.0', 'Day 7 Mid-Sprint Client Update', 'D12', 'Seeded from final plan', null, array['D9'], array['proof_sprint_client_updates'], true, 7, '10:00', true, 'Cron-driven WhatsApp send'),
  ('p14_final_data_lock', '2.0', 'Day 13 Final Data Lock', 'D14', 'Seeded from final plan', null, array['D9','D11'], array['proof_sprint_final_data_locks'], false, 13, '20:00', true, 'Cron-driven calculation lock'),
  ('p15_demand_proof', '2.0', 'Demand Proof Document', 'D15', 'Seeded from final plan', null, array['D14'], array['proof_sprint_demand_proof_documents'], true, null, null, true, 'Manual closeout OpenClaw delivery')
on conflict (prompt_key, version) do update
  set title = excluded.title,
      deliverable_key = excluded.deliverable_key,
      system_prompt = excluded.system_prompt,
      user_prompt_template = excluded.user_prompt_template,
      upstream_dependencies = excluded.upstream_dependencies,
      output_tables = excluded.output_tables,
      openclaw_required = excluded.openclaw_required,
      cron_day = excluded.cron_day,
      cron_time_sast = excluded.cron_time_sast,
      active = excluded.active,
      notes = excluded.notes,
      updated_at = now();
