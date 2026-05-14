-- Extend whatsapp_outreach_queue with columns expected by Outreach-System — 2026-05-14
-- Outreach-System OutreachQueueItem type expects these columns. They were missing
-- from the original AICOS migration (20260510200000), causing as-any casts in
-- Outreach-System API layer.

alter table public.whatsapp_outreach_queue
  add column if not exists niche              text,
  add column if not exists location           text,
  add column if not exists template_name      text,
  add column if not exists template_params    jsonb,
  add column if not exists draft_preview      text,
  add column if not exists ai_observation     text,
  add column if not exists risk_score         int,
  add column if not exists compliance_status  text default 'compliant',
  add column if not exists created_by         text,
  add column if not exists rejection_reason   text;
