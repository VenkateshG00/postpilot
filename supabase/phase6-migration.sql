-- Phase 6 foundation: DB-driven plans, credit packs, channels, credits balance.
-- Idempotent & additive. Safe to run on production (no drops, no data loss).

-- 1. Plans table — config as data (editable by Super Admin)
create table if not exists public.plans (
  key                 text primary key,        -- starter | pro | agency | free
  name                text not null,
  price_inr           integer not null default 0,
  channels_included   integer not null default 1,
  posts_per_day       integer,                 -- null = unlimited
  credits_per_month   integer not null default 0,
  seats_included      integer not null default 1,
  allow_dalle         boolean not null default false,
  white_label         boolean not null default false,
  trial_days          integer not null default 0,
  analytics_level     text    not null default 'basic',  -- basic | full | full_plus
  extra_channel_price integer not null default 0,        -- per channel / month
  extra_seat_price    integer not null default 0,        -- per seat / month
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  updated_at          timestamptz not null default now()
);

-- 2. Credit packs (one-time, never expire)
create table if not exists public.credit_packs (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  credits    integer not null,
  price_inr  integer not null,
  is_active  boolean not null default true,
  sort_order integer not null default 0
);

-- 3. Credits balance on profiles
alter table public.profiles
  add column if not exists credits_balance integer not null default 0;

-- 4. Optional client label on channels (for the switcher / client grouping)
alter table public.social_accounts
  add column if not exists client_label text;

-- 5. Seed plans (matches finalized pricing)
insert into public.plans
  (key, name, price_inr, channels_included, posts_per_day, credits_per_month,
   seats_included, allow_dalle, white_label, trial_days, analytics_level,
   extra_channel_price, extra_seat_price, sort_order)
values
  ('starter','Starter', 499, 1, 2,   90, 1, false, false, 7, 'basic',     249,   0, 1),
  ('pro',    'Pro',    1299, 3, 5,  300, 1, true,  false, 0, 'full',      249,   0, 2),
  ('agency', 'Agency', 4999,10, null,2000,4, true,  true,  0, 'full_plus', 249, 499, 3)
on conflict (key) do update set
  name=excluded.name, price_inr=excluded.price_inr,
  channels_included=excluded.channels_included, posts_per_day=excluded.posts_per_day,
  credits_per_month=excluded.credits_per_month, seats_included=excluded.seats_included,
  allow_dalle=excluded.allow_dalle, white_label=excluded.white_label,
  trial_days=excluded.trial_days, analytics_level=excluded.analytics_level,
  extra_channel_price=excluded.extra_channel_price, extra_seat_price=excluded.extra_seat_price,
  sort_order=excluded.sort_order, updated_at=now();

-- keep legacy 'free' so existing rows with plan='free' still resolve
insert into public.plans (key, name, price_inr, channels_included, posts_per_day,
   credits_per_month, seats_included, sort_order, is_active)
values ('free','Free (legacy)', 0, 1, 1, 0, 1, 0, false)
on conflict (key) do nothing;

-- 6. Seed credit packs
insert into public.credit_packs (name, credits, price_inr, sort_order) values
  ('Small',  10,  79, 1),
  ('Medium', 25, 149, 2),
  ('Large', 100, 499, 3)
on conflict (name) do nothing;

-- 7. RLS: plans + credit_packs are public read config; writes only via service role
alter table public.plans        enable row level security;
alter table public.credit_packs enable row level security;
drop policy if exists "plans_read" on public.plans;
drop policy if exists "credit_packs_read" on public.credit_packs;
create policy "plans_read"        on public.plans        for select using (true);
create policy "credit_packs_read" on public.credit_packs for select using (true);
