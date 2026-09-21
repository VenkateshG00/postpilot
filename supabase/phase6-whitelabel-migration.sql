-- Phase 6 — White-label branding (Agency). Additive & idempotent.
alter table public.profiles add column if not exists brand_name     text;
alter table public.profiles add column if not exists brand_logo_url text;
alter table public.profiles add column if not exists brand_color    text;
