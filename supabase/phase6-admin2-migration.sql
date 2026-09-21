-- Phase 6 — Super Admin panel expansion. Additive & idempotent.

-- Suspend flag (hard block: no login, posting paused)
alter table public.profiles add column if not exists is_suspended boolean not null default false;

-- Global platform settings (single row, id = 1)
create table if not exists public.app_settings (
  id                     int primary key default 1,
  default_trial_days     int  not null default 7,
  default_image_provider text not null default 'pexels',
  cron_frequency         text not null default 'every 5 min',
  maintenance_mode       boolean not null default false,
  announcement_banner    text,
  updated_at             timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- RLS: settings readable by any authenticated (banner/maintenance shown to users); writes service-role only
alter table public.app_settings enable row level security;
drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings for select using (true);
