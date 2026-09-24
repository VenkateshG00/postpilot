-- ============================================================
-- PostPilot — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users (extends Supabase auth.users) ──────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text,
  avatar_url    text,
  plan          text not null default 'free',   -- free | starter | pro | agency
  plan_expires_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Business Profiles ─────────────────────────────────────────
create table public.business_profiles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  business_name   text not null,
  industry        text not null,
  description     text,                          -- what the business does
  target_audience text,
  brand_voice     text,                          -- professional | casual | witty | inspirational
  topics          text[],                        -- content topics array
  hashtags        text[],                        -- default hashtags
  language        text not null default 'en',
  timezone        text not null default 'UTC',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Social Accounts (Instagram / Facebook) ───────────────────
create table public.social_accounts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.profiles(id) on delete cascade not null,
  platform            text not null,             -- instagram | facebook
  account_id          text not null,             -- platform's user/page ID
  account_name        text,
  account_picture_url text,
  access_token        text not null,             -- encrypted long-lived token
  token_expires_at    timestamptz,
  page_id             text,                      -- Facebook Page ID
  ig_business_id      text,                      -- Instagram Business Account ID
  is_active           boolean not null default true,
  connected_at        timestamptz not null default now(),
  unique(user_id, platform, account_id)
);

-- ── Post Schedules ────────────────────────────────────────────
create table public.schedules (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  social_account_id uuid references public.social_accounts(id) on delete cascade not null,
  name            text not null default 'Daily Posts',
  is_active       boolean not null default true,
  frequency       text not null default 'daily', -- daily | weekly | custom
  post_times      text[] not null default '{09:00}', -- HH:MM in user timezone
  days_of_week    int[],                         -- 0=Sun..6=Sat, null = all days
  content_type    text not null default 'post',  -- post | reel | story | carousel
  custom_topics   text[],                        -- override business profile topics
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Post Logs ─────────────────────────────────────────────────
create table public.post_logs (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references public.profiles(id) on delete cascade not null,
  schedule_id       uuid references public.schedules(id) on delete set null,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  platform          text not null,
  status            text not null default 'pending', -- pending | generating | published | failed
  caption           text,
  image_url         text,
  ig_media_id       text,                        -- returned by Instagram API
  ig_permalink      text,
  error_message     text,
  topic_used        text,
  scheduled_for     timestamptz,
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- ── RLS Policies ─────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.business_profiles enable row level security;
alter table public.social_accounts   enable row level security;
alter table public.schedules         enable row level security;
alter table public.post_logs         enable row level security;

-- Profiles: users can only see/edit their own
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

-- Business profiles
create policy "business_own" on public.business_profiles
  for all using (auth.uid() = user_id);

-- Social accounts
create policy "social_own" on public.social_accounts
  for all using (auth.uid() = user_id);

-- Schedules
create policy "schedules_own" on public.schedules
  for all using (auth.uid() = user_id);

-- Post logs
create policy "logs_own" on public.post_logs
  for all using (auth.uid() = user_id);

-- ── Auto-create profile on signup ────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, plan, plan_expires_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'trial',
    now() + interval '7 days'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Updated_at trigger ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.business_profiles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.schedules
  for each row execute procedure public.set_updated_at();
