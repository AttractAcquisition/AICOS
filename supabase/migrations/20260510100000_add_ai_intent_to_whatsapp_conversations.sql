-- SUPERSEDED: whatsapp_conversations is owned by Outreach-System repo.
-- ai_intent and needs_human columns already exist from Outreach-System migration 20260503190000.
-- The stage constraint below conflicts with Outreach-System vocabulary — DO NOT APPLY.
-- Live stage constraint (Outreach-System): new, needs_reply, qualified, quoted, booked, won, lost, bad_fit
-- This migration would drop the live constraint and replace it with AICOS vocabulary,
-- breaking all Outreach-System stage values that exist in the live DB.

alter table public.whatsapp_conversations
  add column if not exists ai_intent    text
    check (ai_intent in ('warm', 'cold', 'not_interested', 'unsubscribed')),
  add column if not exists needs_human  boolean;

-- Intentional no-op: stage constraint is managed by Outreach-System with canonical vocabulary.
-- Original ALTER below is preserved for reference only — it must NOT execute.
DO $$ BEGIN
  -- intentionally no-op: constraint managed by Outreach-System
  -- original: drop constraint whatsapp_conversations_stage_check + re-add with AICOS vocabulary
  -- this would conflict with live stages: needs_reply, quoted, booked, bad_fit
END $$;

-- Index for the UI's "needs human attention" queue
create index if not exists whatsapp_conversations_needs_human_idx
  on public.whatsapp_conversations (needs_human, updated_at desc)
  where needs_human = true;

-- Index for filtering by AI intent (e.g. all warm conversations)
create index if not exists whatsapp_conversations_ai_intent_idx
  on public.whatsapp_conversations (ai_intent)
  where ai_intent is not null;
