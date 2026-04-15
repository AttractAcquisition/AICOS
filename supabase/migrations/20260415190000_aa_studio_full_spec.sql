set check_function_bodies = false;

-- ============================================================
-- AA STUDIO CORE HELPERS
-- ============================================================

create or replace function public.aa_is_staff()
returns boolean
language sql
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), '') in ('admin', 'delivery');
$$;

create or replace function public.aa_can_access_client(target_client_id uuid)
returns boolean
language sql
stable
as $$
  select public.aa_is_staff()
     or target_client_id = (select client_id from public.profiles where id = auth.uid());
$$;

-- ============================================================
-- CORE TABLES
-- ============================================================

create table if not exists public.brand_intelligence (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade unique,
  business_name text,
  sector text,
  trade_type text,
  location text,
  service_radius_km int,
  icp_demographics jsonb,
  icp_psychology jsonb,
  avg_job_value_zar int,
  conversion_objective text,
  brand_voice_descriptors text[],
  competitor_references text[],
  differentiation_notes text,
  primary_hex text,
  secondary_hex text,
  font_selection text,
  sample_copy text,
  testimonials jsonb,
  logo_url text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_ai_context (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade unique,
  context_json jsonb not null,
  context_version int not null default 1,
  last_assembled_at timestamptz not null default now()
);

create table if not exists public.positioning_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  doc_type text not null check (doc_type in ('attraction', 'nurture', 'conversion')),
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'archived')),
  content jsonb not null,
  narrative_arc text,
  psychological_triggers jsonb,
  objection_stack jsonb,
  proof_point_ranking jsonb,
  cycle_id uuid,
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop table if exists public.scripts cascade;

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  objective text not null check (objective in ('attraction', 'nurture', 'conversion')),
  content_type text not null check (content_type in ('static_ad', 'post', 'reel', 'story', 'carousel')),
  tone_variant text check (tone_variant in ('proof', 'authority', 'urgency', 'social_proof')),
  hook_text text not null,
  body_text text,
  cta_text text,
  platform text check (platform in ('feed', 'stories', 'reels', 'all')),
  psychological_alignment_score int check (psychological_alignment_score between 0 and 100),
  cycle_id uuid,
  version int not null default 1,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.script_pack_exports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_id uuid,
  export_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.proof_assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  file_url text not null,
  file_type text check (file_type in ('photo', 'video', 'before_after_pair')),
  storage_path text not null,
  asset_tag text check (asset_tag in ('proof', 'process', 'result', 'testimonial', 'team', 'before', 'after')),
  job_type text,
  job_location text,
  approx_job_value_zar int,
  ai_caption text,
  alt_text text,
  proof_score int check (proof_score between 0 and 10),
  content_use_suggestion text,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  pair_asset_id uuid references public.proof_assets(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organic_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_id uuid,
  funnel_layer text not null check (funnel_layer in ('attraction', 'nurture', 'conversion')),
  content_format text not null check (content_format in ('feed_post', 'carousel', 'reel', 'story')),
  caption text,
  hook_variants jsonb,
  body_copy text,
  cta_text text,
  hashtag_set text[],
  reel_script jsonb,
  carousel_slides jsonb,
  asset_ids uuid[],
  brand_voice_score int,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected')),
  scheduled_at timestamptz,
  published_at timestamptz,
  approval_queue_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_builds (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  bio_copy text,
  bio_cta text,
  highlights_plan jsonb,
  pinned_post_brief jsonb,
  link_in_bio_headline text,
  link_in_bio_button_label text,
  link_in_bio_destination text,
  profile_conversion_funnel_map text,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved')),
  version int not null default 1,
  approval_queue_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_creative_briefs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_id uuid,
  campaign_objective text not null check (campaign_objective in ('attraction', 'nurture', 'conversion')),
  headline_variants jsonb not null,
  primary_text text not null,
  visual_direction text not null,
  cta_copy text not null,
  placement text check (placement in ('feed', 'stories', 'reels', 'all')),
  variant_index int not null default 1,
  asset_id uuid references public.proof_assets(id),
  ad_creative_ai_pack_url text,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'exported')),
  approval_queue_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_queue (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_id uuid,
  content_type text not null check (content_type in ('organic_post', 'ad_brief', 'profile_build', 'positioning_doc')),
  content_id uuid not null,
  reviewer_type text check (reviewer_type in ('internal', 'client_facing')),
  assigned_to uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revision_requested', 'rejected')),
  brand_voice_score int,
  cta_present bool,
  funnel_alignment_check bool,
  approval_readiness_score int,
  revision_notes text,
  line_comments jsonb,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_number int not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'complete', 'paused')),
  week1_status text not null default 'build',
  week2_status text not null default 'pending',
  completion_report jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_id uuid not null references public.cycles(id) on delete cascade,
  content_type text not null check (content_type in ('organic_post', 'ad_brief')),
  content_id uuid not null,
  funnel_layer text check (funnel_layer in ('attraction', 'nurture', 'conversion')),
  format text,
  scheduled_date date,
  scheduled_time time,
  publish_status text not null default 'scheduled' check (publish_status in ('scheduled', 'published', 'missed')),
  platform text not null default 'instagram',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.brand_intelligence enable row level security;
alter table public.client_ai_context enable row level security;
alter table public.positioning_documents enable row level security;
alter table public.scripts enable row level security;
alter table public.script_pack_exports enable row level security;
alter table public.proof_assets enable row level security;
alter table public.organic_posts enable row level security;
alter table public.profile_builds enable row level security;
alter table public.ad_creative_briefs enable row level security;
alter table public.approval_queue enable row level security;
alter table public.cycles enable row level security;
alter table public.content_calendar_entries enable row level security;

drop policy if exists brand_intelligence_access on public.brand_intelligence;
create policy brand_intelligence_access on public.brand_intelligence
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists client_ai_context_access on public.client_ai_context;
create policy client_ai_context_access on public.client_ai_context
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists positioning_documents_access on public.positioning_documents;
create policy positioning_documents_access on public.positioning_documents
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists scripts_access on public.scripts;
create policy scripts_access on public.scripts
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists script_pack_exports_access on public.script_pack_exports;
create policy script_pack_exports_access on public.script_pack_exports
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists proof_assets_access on public.proof_assets;
create policy proof_assets_access on public.proof_assets
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists organic_posts_access on public.organic_posts;
create policy organic_posts_access on public.organic_posts
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists profile_builds_access on public.profile_builds;
create policy profile_builds_access on public.profile_builds
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists ad_creative_briefs_access on public.ad_creative_briefs;
create policy ad_creative_briefs_access on public.ad_creative_briefs
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists approval_queue_access on public.approval_queue;
create policy approval_queue_access on public.approval_queue
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists cycles_access on public.cycles;
create policy cycles_access on public.cycles
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

drop policy if exists content_calendar_entries_access on public.content_calendar_entries;
create policy content_calendar_entries_access on public.content_calendar_entries
  for all using (public.aa_can_access_client(client_id)) with check (public.aa_can_access_client(client_id));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('proof-assets', 'proof-assets', false),
  ('brand-assets', 'brand-assets', false),
  ('exports', 'exports', false)
on conflict (id) do update set name = excluded.name, public = excluded.public;
