-- Approval queue: per-account "require approval before publishing" flag.
-- Idempotent & additive. Safe to run on production.
alter table public.social_accounts
  add column if not exists require_approval boolean not null default false;
