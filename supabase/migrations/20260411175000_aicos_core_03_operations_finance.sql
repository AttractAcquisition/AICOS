-- AICOS operational, delivery, and finance tables

create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  sprint_number integer not null default 1,
  sprint_type text not null default 'proof',
  vertical text,
  status text not null default 'setup' check (status in ('setup', 'active', 'complete', 'paused', 'cancelled')),
  start_date date not null,
  end_date date,
  client_name text,
  client_ad_budget numeric(12,2),
  actual_ad_spend numeric(12,2),
  total_impressions integer,
  total_reach integer,
  link_clicks integer,
  leads_generated integer,
  bookings_from_sprint integer,
  revenue_attributed numeric(14,2),
  results_meeting_date date,
  results_meeting_outcome text,
  day7_notes text,
  day7_sentiment text,
  talking_points text,
  close_notes text,
  content_pieces jsonb not null default '[]'::jsonb,
  report_file_path text,
  report_status text not null default 'draft' check (report_status in ('draft', 'generated', 'shared', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprints_client_sprint_number_key unique (client_id, sprint_number)
);

create index if not exists sprints_client_id_idx on public.sprints (client_id);
create index if not exists sprints_prospect_id_idx on public.sprints (prospect_id);
create index if not exists sprints_status_idx on public.sprints (status);

create table if not exists public.sprint_daily_logs (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  log_date date not null,
  day_number integer,
  spend numeric(12,2),
  reach integer,
  impressions integer,
  link_clicks integer,
  leads integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprint_daily_logs_sprint_id_log_date_key unique (sprint_id, log_date)
);

create index if not exists sprint_daily_logs_sprint_id_idx on public.sprint_daily_logs (sprint_id);
create index if not exists sprint_daily_logs_log_date_idx on public.sprint_daily_logs (log_date);

create table if not exists public.distribution_metrics (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles(id) on delete cascade,
  date_key text not null,
  prospects_scraped integer,
  prospects_enriched integer,
  outreach_sent integer,
  mjrs_built integer,
  mjrs_sent integer,
  followups_sent integer,
  calls_booked integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distribution_metrics_manager_date_key unique (manager_id, date_key)
);

create index if not exists distribution_metrics_manager_id_idx on public.distribution_metrics (manager_id);
create index if not exists distribution_metrics_date_key_idx on public.distribution_metrics (date_key);

create table if not exists public.delivery_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  date_key text not null,
  profile_visits integer,
  dms_started integer,
  qualified_followers integer,
  appointments_booked integer,
  cash_collected numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_metrics_client_date_key unique (client_id, date_key)
);

create index if not exists delivery_metrics_client_id_idx on public.delivery_metrics (client_id);
create index if not exists delivery_metrics_manager_id_idx on public.delivery_metrics (manager_id);
create index if not exists delivery_metrics_date_key_idx on public.delivery_metrics (date_key);

create table if not exists public.distribution_progress (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles(id) on delete cascade,
  task_id text not null,
  date_key text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  is_completed boolean not null default false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distribution_progress_unique_key unique (manager_id, task_id, date_key)
);

create index if not exists distribution_progress_manager_id_idx on public.distribution_progress (manager_id);
create index if not exists distribution_progress_date_key_idx on public.distribution_progress (date_key);

create table if not exists public.delivery_progress (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles(id) on delete cascade,
  task_id text not null,
  date_key text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  is_completed boolean not null default false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_progress_unique_key unique (manager_id, task_id, date_key)
);

create index if not exists delivery_progress_manager_id_idx on public.delivery_progress (manager_id);
create index if not exists delivery_progress_date_key_idx on public.delivery_progress (date_key);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'blocked', 'complete', 'archived')),
  due_date date not null,
  month_key text not null,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  is_milestone boolean not null default false,
  milestone_label text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_month_key_idx on public.tasks (month_key);
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_assigned_to_profile_id_idx on public.tasks (assigned_to_profile_id);
create index if not exists tasks_client_id_idx on public.tasks (client_id);

create table if not exists public.deliverable_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  sprint_id uuid references public.sprints(id) on delete cascade,
  title text not null,
  position integer not null,
  is_completed boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deliverable_items_client_position_key unique (client_id, position)
);

create index if not exists deliverable_items_client_id_idx on public.deliverable_items (client_id);
create index if not exists deliverable_items_sprint_id_idx on public.deliverable_items (sprint_id);
create index if not exists deliverable_items_position_idx on public.deliverable_items (position);

create table if not exists public.portal_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  sender_id text,
  sender_kind text not null default 'internal' check (sender_kind in ('internal', 'client', 'system')),
  message_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_messages_client_id_idx on public.portal_messages (client_id);
create index if not exists portal_messages_manager_id_idx on public.portal_messages (manager_id);

create table if not exists public.portal_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'complete', 'blocked', 'archived')),
  priority text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_tasks_client_id_idx on public.portal_tasks (client_id);
create index if not exists portal_tasks_manager_id_idx on public.portal_tasks (manager_id);
create index if not exists portal_tasks_status_idx on public.portal_tasks (status);

create table if not exists public.portal_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  uploaded_by text,
  file_name text not null,
  file_path text not null,
  bucket_name text not null default 'portal-documents',
  status text not null default 'shared' check (status in ('draft', 'review', 'shared', 'indexed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_documents_client_id_idx on public.portal_documents (client_id);
create index if not exists portal_documents_manager_id_idx on public.portal_documents (manager_id);
create index if not exists portal_documents_status_idx on public.portal_documents (status);

create table if not exists public.sops (
  id uuid primary key default gen_random_uuid(),
  sop_number integer not null unique,
  title text not null,
  category text,
  description text,
  body text,
  files jsonb not null default '[]'::jsonb,
  last_reviewed_at timestamptz,
  reviewed_by text,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'under_review', 'archived')),
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sops_status_idx on public.sops (status);
create index if not exists sops_category_idx on public.sops (category);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  content text,
  variables text[] not null default '{}'::text[],
  char_count integer,
  last_edited_by text,
  last_edited_by_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'review', 'shared', 'indexed', 'archived')),
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists templates_category_idx on public.templates (category);
create index if not exists templates_status_idx on public.templates (status);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_path text not null,
  bucket_name text not null default 'assets',
  file_type text,
  associated_entity_type text not null default 'document',
  associated_entity_id uuid,
  uploaded_by text,
  uploaded_by_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_bucket_name_idx on public.assets (bucket_name);
create index if not exists assets_associated_entity_idx on public.assets (associated_entity_type, associated_entity_id);

create table if not exists public.financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  active_client_count integer,
  gross_mrr numeric(14,2),
  schedule_d_mrr_target numeric(14,2),
  ad_infrastructure_costs numeric(14,2),
  va_costs numeric(14,2),
  software_costs numeric(14,2),
  other_costs numeric(14,2),
  personal_cash_balance numeric(14,2),
  cash_reserves numeric(14,2),
  trust_balance_start numeric(14,2),
  trust_deployment numeric(14,2),
  trust_balance_end numeric(14,2),
  setup_fees_collected numeric(14,2),
  principal_draw numeric(14,2),
  total_expenses numeric(14,2),
  net_profit numeric(14,2),
  profit_margin numeric(8,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_snapshots_month_idx on public.financial_snapshots (month);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type public.transaction_type not null,
  amount numeric(14,2) not null,
  category text not null,
  client_id uuid references public.clients(id) on delete set null,
  client_name text,
  description text,
  status text not null default 'pending' check (status in ('pending', 'posted', 'reconciled', 'void')),
  is_recurring boolean not null default false,
  tags text[] not null default '{}'::text[],
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

 create index if not exists ledger_entries_date_idx on public.ledger_entries (date);
create index if not exists ledger_entries_client_id_idx on public.ledger_entries (client_id);
create index if not exists ledger_entries_type_idx on public.ledger_entries (type);
create index if not exists ledger_entries_status_idx on public.ledger_entries (status);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  sprint_id uuid references public.sprints(id) on delete set null,
  name text not null,
  channel text,
  status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'complete', 'archived')),
  budget numeric(14,2),
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_prospect_id_idx on public.campaigns (prospect_id);
create index if not exists campaigns_client_id_idx on public.campaigns (client_id);
create index if not exists campaigns_sprint_id_idx on public.campaigns (sprint_id);

create table if not exists public.sprint_reports (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  report_type text not null,
  title text,
  summary text,
  body text,
  file_path text,
  status text not null default 'draft' check (status in ('draft', 'generated', 'shared', 'archived')),
  generated_by_profile_id uuid references public.profiles(id) on delete set null,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sprint_reports_sprint_id_idx on public.sprint_reports (sprint_id);
create index if not exists sprint_reports_status_idx on public.sprint_reports (status);

create table if not exists public.manager_reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  manager_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists manager_reviews_client_id_idx on public.manager_reviews (client_id);
create index if not exists manager_reviews_manager_id_idx on public.manager_reviews (manager_id);
