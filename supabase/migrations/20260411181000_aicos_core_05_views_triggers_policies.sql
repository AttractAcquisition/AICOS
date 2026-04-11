-- AICOS triggers, compatibility views, RLS, and helper functions

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    nullif(lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'role', auth.jwt() -> 'app_metadata' ->> 'role', 'client')), ''),
    'client'
  );
$$;

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_role();
$$;

create or replace function public.check_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_role() in ('admin', 'distribution', 'delivery');
$$;

create or replace function public.get_my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.client_id
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.get_my_metadata_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.uid()::text, '');
$$;

create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.get_my_role() = 'admin' then true
    when public.get_my_role() = 'distribution' then exists (
      select 1
      from public.clients c
      where c.id = target_client_id
        and c.distribution_owner_profile_id = auth.uid()
    )
    when public.get_my_role() = 'delivery' then exists (
      select 1
      from public.clients c
      where c.id = target_client_id
        and c.delivery_owner_profile_id = auth.uid()
    )
    when public.get_my_role() = 'client' then exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.client_id = target_client_id
    )
    else false
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text := lower(coalesce(new.raw_user_meta_data ->> 'role', new.raw_app_meta_data ->> 'role', 'client'));
  _client_id uuid := nullif(new.raw_user_meta_data ->> 'client_id', '')::uuid;
begin
  if _role not in ('admin', 'distribution', 'delivery', 'client') then
    _role := 'client';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    client_id,
    is_active,
    created_at,
    updated_at
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    _role,
    _client_id,
    true,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone,
        role = excluded.role,
        client_id = excluded.client_id,
        updated_at = now();

  return new;
end;
$$;


-- Keep timestamps current across the core tables.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'prospects',
    'clients',
    'sprints',
    'sprint_daily_logs',
    'distribution_metrics',
    'delivery_metrics',
    'distribution_progress',
    'delivery_progress',
    'tasks',
    'deliverable_items',
    'portal_messages',
    'portal_tasks',
    'portal_documents',
    'sops',
    'templates',
    'assets',
    'financial_snapshots',
    'ledger_entries',
    'campaigns',
    'sprint_reports',
    'knowledge_documents',
    'knowledge_chunks',
    'knowledge_queries',
    'approval_logs',
    'exception_logs',
    'integration_events',
    'manager_reviews'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I;', tbl);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();', tbl);
  end loop;
end $$;

-- Create/update a profile whenever auth.users changes.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Compatibility views for the existing app surface.
create or replace view public.proof_sprints with (security_invoker = true) as
  select * from public.sprints;

create or replace view public.sprint_daily_log with (security_invoker = true) as
  select * from public.sprint_daily_logs;

create or replace view public.monthly_revenue with (security_invoker = true) as
  select * from public.financial_snapshots;

create or replace view public.ledger with (security_invoker = true) as
  select * from public.ledger_entries;

create or replace view public.distro_metrics with (security_invoker = true) as
  select * from public.distribution_metrics;

create or replace view public.app_files with (security_invoker = true) as
  select
    id,
    associated_entity_id as associated_sop_id,
    file_name,
    file_path,
    file_type,
    uploaded_by,
    created_at,
    updated_at
  from public.assets;

create or replace view public.aa_documents with (security_invoker = true) as
  select * from public.knowledge_documents;

create or replace view public.aa_chunks with (security_invoker = true) as
  select * from public.knowledge_chunks;

create or replace view public.aa_queries with (security_invoker = true) as
  select * from public.knowledge_queries;

create or replace view public.client_deliverables with (security_invoker = true) as
  select * from public.deliverable_items;

create or replace view public.ops_manager_status with (security_invoker = true) as
select
  greatest(
    coalesce(max(greatest(p.updated_at, p.created_at)), 'epoch'::timestamptz),
    coalesce(max(tp.updated_at), 'epoch'::timestamptz),
    coalesce(max(dp.updated_at), 'epoch'::timestamptz)
  ) as last_active,
  p.id as manager_id,
  p.full_name as name,
  p.role,
  count(distinct case when coalesce(tp.is_completed, false) then tp.task_id end) + count(distinct case when coalesce(dp.is_completed, false) then dp.task_id end) as tasks_completed,
  count(distinct tp.task_id) + count(distinct dp.task_id) as total_tasks_assigned
from public.profiles p
left join public.distribution_progress tp on tp.manager_id = p.id
left join public.delivery_progress dp on dp.manager_id = p.id
where p.role in ('admin', 'distribution', 'delivery')
group by p.id, p.full_name, p.role;

-- Helpers used by the dashboard and typed client.
create or replace function public.get_ops_manager_status()
returns table (
  last_active timestamptz,
  manager_id uuid,
  name text,
  role text,
  tasks_completed bigint,
  total_tasks_assigned bigint
)
language sql
stable
as $$
  select * from public.ops_manager_status;
$$;

create or replace function public.get_monthly_stats(month_date text)
returns table (
  total_income numeric,
  total_expense numeric,
  net_profit numeric
)
language sql
stable
as $$
  select
    coalesce(sum(case when type = 'income' then amount else 0 end), 0)::numeric as total_income,
    coalesce(sum(case when type = 'expense' then amount else 0 end), 0)::numeric as total_expense,
    (coalesce(sum(case when type = 'income' then amount else 0 end), 0) - coalesce(sum(case when type = 'expense' then amount else 0 end), 0))::numeric as net_profit
  from public.ledger_entries
  where to_char(date, 'YYYY-MM') = month_date;
$$;

-- Enable row level security everywhere that matters.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'prospects',
    'clients',
    'sprints',
    'sprint_daily_logs',
    'distribution_metrics',
    'delivery_metrics',
    'distribution_progress',
    'delivery_progress',
    'tasks',
    'deliverable_items',
    'portal_messages',
    'portal_tasks',
    'portal_documents',
    'sops',
    'templates',
    'assets',
    'financial_snapshots',
    'ledger_entries',
    'campaigns',
    'sprint_reports',
    'knowledge_documents',
    'knowledge_chunks',
    'knowledge_queries',
    'approval_logs',
    'exception_logs',
    'role_assignment_history',
    'integration_events',
    'audit_events',
    'manager_reviews'
  ] loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('alter table public.%I force row level security;', tbl);
  end loop;
end $$;

-- Profiles: users can see themselves, staff can see all.
create policy profiles_select_self_or_staff on public.profiles
for select using (auth.uid() = id or public.check_is_staff());

create policy profiles_insert_self_or_admin on public.profiles
for insert with check (auth.uid() = id or public.get_my_role() = 'admin');

create policy profiles_update_self_or_admin on public.profiles
for update using (auth.uid() = id or public.get_my_role() = 'admin')
with check (auth.uid() = id or public.get_my_role() = 'admin');

-- Prospects: acquisition staff only.
create policy prospects_select_staff on public.prospects
for select using (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy prospects_write_distribution_admin on public.prospects
for all using (public.get_my_role() in ('admin', 'distribution'))
with check (public.get_my_role() in ('admin', 'distribution'));

-- Clients: staff plus the matched client user.
create policy clients_select_staff_or_owner on public.clients
for select using (
  public.get_my_role() in ('admin', 'distribution', 'delivery')
  or public.can_access_client(id)
);

create policy clients_write_admin_delivery on public.clients
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Sprints: delivery/admin write, staff or matched client read.
create policy sprints_select_staff_or_owner on public.sprints
for select using (
  public.get_my_role() in ('admin', 'distribution', 'delivery')
  or public.can_access_client(client_id)
);

create policy sprints_write_admin_delivery on public.sprints
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

create policy sprint_daily_logs_select_staff_or_owner on public.sprint_daily_logs
for select using (
  public.get_my_role() in ('admin', 'distribution', 'delivery')
  or exists (
    select 1 from public.sprints s where s.id = sprint_id and public.can_access_client(s.client_id)
  )
);

create policy sprint_daily_logs_write_admin_delivery on public.sprint_daily_logs
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Metrics.
create policy distribution_metrics_select_staff on public.distribution_metrics
for select using (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy distribution_metrics_write_admin_distribution on public.distribution_metrics
for all using (public.get_my_role() in ('admin', 'distribution'))
with check (public.get_my_role() in ('admin', 'distribution'));

create policy delivery_metrics_select_staff_or_owner on public.delivery_metrics
for select using (
  public.get_my_role() in ('admin', 'distribution', 'delivery')
  or public.can_access_client(client_id)
);

create policy delivery_metrics_write_admin_delivery on public.delivery_metrics
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Progress trackers.
create policy distribution_progress_select_write_staff on public.distribution_progress
for all using (public.get_my_role() in ('admin', 'distribution'))
with check (public.get_my_role() in ('admin', 'distribution'));

create policy delivery_progress_select_write_staff on public.delivery_progress
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Internal tasking.
create policy tasks_select_staff on public.tasks
for select using (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy tasks_write_staff on public.tasks
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

-- Client deliverables.
create policy deliverable_items_select_staff_or_owner on public.deliverable_items
for select using (
  public.get_my_role() in ('admin', 'distribution', 'delivery')
  or public.can_access_client(client_id)
);

create policy deliverable_items_write_admin_delivery on public.deliverable_items
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Portal messages.
create policy portal_messages_select_staff_or_owner on public.portal_messages
for select using (
  public.get_my_role() in ('admin', 'delivery')
  or public.can_access_client(client_id)
);

create policy portal_messages_insert_staff_or_client on public.portal_messages
for insert with check (
  public.get_my_role() in ('admin', 'delivery')
  or (public.get_my_role() = 'client' and public.can_access_client(client_id))
);

create policy portal_messages_update_staff_only on public.portal_messages
for update using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Portal tasks.
create policy portal_tasks_select_staff_or_owner on public.portal_tasks
for select using (
  public.get_my_role() in ('admin', 'delivery')
  or public.can_access_client(client_id)
);

create policy portal_tasks_write_staff_or_owner on public.portal_tasks
for all using (
  public.get_my_role() in ('admin', 'delivery')
  or (public.get_my_role() = 'client' and public.can_access_client(client_id))
)
with check (
  public.get_my_role() in ('admin', 'delivery')
  or (public.get_my_role() = 'client' and public.can_access_client(client_id))
);

-- Portal documents.
create policy portal_documents_select_staff_or_owner on public.portal_documents
for select using (
  public.get_my_role() in ('admin', 'delivery')
  or public.can_access_client(client_id)
);

create policy portal_documents_write_staff_only on public.portal_documents
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Content libraries and knowledge base.
create policy sops_staff_all on public.sops
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy templates_staff_all on public.templates
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy assets_staff_all on public.assets
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy knowledge_documents_staff_all on public.knowledge_documents
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy knowledge_chunks_staff_all on public.knowledge_chunks
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy knowledge_queries_staff_or_owner on public.knowledge_queries
for select using (public.get_my_role() in ('admin', 'distribution', 'delivery') or user_profile_id = auth.uid());

create policy knowledge_queries_insert_staff_or_client on public.knowledge_queries
for insert with check (public.get_my_role() in ('admin', 'distribution', 'delivery', 'client'));

create policy knowledge_queries_update_staff_only on public.knowledge_queries
for update using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

-- Finance is admin-only.
create policy financial_snapshots_admin_all on public.financial_snapshots
for all using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

create policy ledger_entries_admin_all on public.ledger_entries
for all using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

-- Campaigns and reports.
create policy campaigns_staff_all on public.campaigns
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy sprint_reports_select_staff_or_owner on public.sprint_reports
for select using (
  public.get_my_role() in ('admin', 'distribution', 'delivery')
  or exists (
    select 1 from public.sprints s where s.id = sprint_id and public.can_access_client(s.client_id)
  )
);

create policy sprint_reports_staff_all on public.sprint_reports
for all using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

-- Reviews and governance logs.
create policy manager_reviews_select_staff_or_owner on public.manager_reviews
for select using (public.get_my_role() in ('admin', 'delivery') or public.can_access_client(client_id));

create policy manager_reviews_insert_staff_or_owner on public.manager_reviews
for insert with check (public.get_my_role() in ('admin', 'delivery') or public.can_access_client(client_id));

create policy manager_reviews_update_staff_only on public.manager_reviews
for update using (public.get_my_role() in ('admin', 'delivery'))
with check (public.get_my_role() in ('admin', 'delivery'));

create policy approval_logs_staff_all on public.approval_logs
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy exception_logs_staff_all on public.exception_logs
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

create policy role_assignment_history_admin_all on public.role_assignment_history
for all using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

create policy integration_events_admin_all on public.integration_events
for all using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

create policy audit_events_admin_all on public.audit_events
for all using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

