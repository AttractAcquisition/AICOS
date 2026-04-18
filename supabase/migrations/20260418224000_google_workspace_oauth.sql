create table if not exists public.google_workspace_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Attract Acquisition',
  account_email text not null,
  provider text not null default 'google',
  scopes text[] not null default array[]::text[],
  refresh_token_encrypted jsonb not null,
  token_type text not null default 'Bearer',
  access_token_expires_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_name, account_email, provider)
);

alter table public.google_workspace_oauth_connections enable row level security;
