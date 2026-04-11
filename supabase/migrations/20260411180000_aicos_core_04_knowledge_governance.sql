-- AICOS knowledge, governance, and audit tables

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text,
  source_type text not null,
  source_path text,
  file_path text,
  body text,
  status text not null default 'draft' check (status in ('draft', 'review', 'shared', 'indexed', 'archived')),
  version text,
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  indexed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists knowledge_documents_slug_key on public.knowledge_documents (slug) where slug is not null;
create index if not exists knowledge_documents_status_idx on public.knowledge_documents (status);
create index if not exists knowledge_documents_source_type_idx on public.knowledge_documents (source_type);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  content_hash text,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_chunks_document_chunk_key unique (document_id, chunk_index)
);

create index if not exists knowledge_chunks_document_id_idx on public.knowledge_chunks (document_id);
create index if not exists knowledge_chunks_content_hash_idx on public.knowledge_chunks (content_hash);

create table if not exists public.knowledge_queries (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid references public.profiles(id) on delete set null,
  query_text text not null,
  answer_text text,
  model_name text,
  citations jsonb not null default '[]'::jsonb,
  retrieved_chunk_ids uuid[] not null default '{}'::uuid[],
  response_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_queries_user_profile_id_idx on public.knowledge_queries (user_profile_id);
create index if not exists knowledge_queries_created_at_idx on public.knowledge_queries (created_at);

create table if not exists public.approval_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  approval_type text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_changes', 'withdrawn')),
  requested_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  review_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_logs_entity_idx on public.approval_logs (entity_type, entity_id);
create index if not exists approval_logs_status_idx on public.approval_logs (status);

create table if not exists public.exception_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  severity text,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  summary text,
  details text,
  reported_by_profile_id uuid references public.profiles(id) on delete set null,
  resolved_by_profile_id uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exception_logs_status_idx on public.exception_logs (status);
create index if not exists exception_logs_entity_idx on public.exception_logs (entity_type, entity_id);

create table if not exists public.role_assignment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_role text,
  new_role text not null check (new_role in ('admin', 'distribution', 'delivery', 'client')),
  changed_by_profile_id uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists role_assignment_history_user_id_idx on public.role_assignment_history (user_id);
create index if not exists role_assignment_history_created_at_idx on public.role_assignment_history (created_at);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  integration_name text not null,
  source_system text,
  target_system text,
  event_type text,
  status text not null default 'queued' check (status in ('active', 'failed', 'paused', 'queued', 'completed')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  triggered_by_profile_id uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_events_status_idx on public.integration_events (status);
create index if not exists integration_events_integration_name_idx on public.integration_events (integration_name);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id);
create index if not exists audit_events_created_at_idx on public.audit_events (created_at);
