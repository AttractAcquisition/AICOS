-- AICOS people and pipeline tables

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'client' check (role in ('admin', 'distribution', 'delivery', 'client')),
  client_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_client_id_idx on public.profiles (client_id);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text,
  phone text,
  whatsapp text,
  email text,
  website text,
  instagram_handle text,
  address text,
  city text,
  suburb text,
  vertical text,
  data_source text,
  apify_run_id text,
  source_payload jsonb not null default '{}'::jsonb,
  assigned_to text,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'active', 'closed_won', 'archived')),
  pipeline_stage text not null default 'First Touch' check (pipeline_stage in ('First Touch', 'Positive Response', 'MJR Sent', 'Follow Up', 'Call Booked', 'Sprint Booked')),
  priority_cohort text,
  target_date date,
  last_scraped_at timestamptz,
  has_meta_ads boolean not null default false,
  meta_ads_running boolean not null default false,
  google_rating numeric(4,2),
  google_review_count integer,
  ig_follower_count integer,
  q_owner_op boolean not null default false,
  q_high_ticket boolean not null default false,
  q_referral boolean not null default false,
  q_visual boolean not null default false,
  q_weak_digital boolean not null default false,
  score_ticket_size integer,
  score_owner_accessibility integer,
  score_visual_transformability integer,
  score_digital_weakness integer,
  score_growth_hunger integer,
  icp_total_score integer,
  icp_tier text,
  outreach_attempted boolean not null default false,
  msg_1_sent boolean not null default false,
  msg_2_sent boolean not null default false,
  msg_3_sent boolean not null default false,
  msg_4_sent boolean not null default false,
  msg_5_sent boolean not null default false,
  mjr_delivered_at timestamptz,
  mjr_link text,
  mjr_missed_revenue numeric(14,2),
  mjr_notes text,
  spoa_delivered_at timestamptz,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_pipeline_stage_idx on public.prospects (pipeline_stage);
create index if not exists prospects_vertical_idx on public.prospects (vertical);
create index if not exists prospects_assigned_to_profile_id_idx on public.prospects (assigned_to_profile_id);
create index if not exists prospects_icp_total_score_idx on public.prospects (icp_total_score);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid unique references public.prospects(id) on delete set null,
  business_name text not null,
  owner_name text not null,
  email text,
  phone text,
  whatsapp text,
  status text not null default 'active' check (status in ('active', 'paused', 'churned', 'archived')),
  tier text not null default 'Proof Sprint',
  contract_start_date date,
  contract_end_date date,
  monthly_retainer numeric(12,2),
  monthly_ad_spend numeric(12,2),
  setup_fee numeric(12,2),
  meta_ad_account_id text,
  meta_pixel_id text,
  account_manager text,
  account_manager_name text,
  client_delivery_va text,
  distribution_owner_profile_id uuid references public.profiles(id) on delete set null,
  delivery_owner_profile_id uuid references public.profiles(id) on delete set null,
  churn_risk_flag boolean not null default false,
  upsell_ready_flag boolean not null default false,
  notes text,
  last_results_meeting date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_tier_check check (tier in ('Proof Sprint', 'Proof Brand', 'Authority Brand', 'Consulting'))
);

create index if not exists clients_status_idx on public.clients (status);
create index if not exists clients_tier_idx on public.clients (tier);
create index if not exists clients_distribution_owner_profile_id_idx on public.clients (distribution_owner_profile_id);
create index if not exists clients_delivery_owner_profile_id_idx on public.clients (delivery_owner_profile_id);

alter table public.profiles
  add constraint profiles_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;
