alter table public.sops
  add column if not exists content text;

comment on column public.sops.content is 'SOP body text';
