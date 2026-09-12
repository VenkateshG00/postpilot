-- ============================================================
-- PostPilot — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (extended profile — auth.users handled by Supabase)
-- ============================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  plan_expires_at TIMESTAMPTZ,
  onboarded     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BUSINESS PROFILES
-- ============================================================
CREATE TABLE public.business_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name   TEXT NOT NULL,
  industry        TEXT NOT NULL,
  description     TEXT NOT NULL,        -- Used as AI context
  target_audience TEXT,
  tone            TEXT NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'witty', 'inspirational', 'educational')),
  language        TEXT NOT NULL DEFAULT 'en',
  website         TEXT,
  location        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own business profiles" ON public.business_profiles
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SOCIAL ACCOUNTS (Instagram / Facebook tokens per user)
-- ============================================================
CREATE TABLE public.social_accounts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform              TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  platform_account_id   TEXT NOT NULL,        -- Instagram user ID
  page_id               TEXT,                 -- Facebook Page ID
  username              TEXT,
  access_token          TEXT NOT NULL,        -- Long-lived token (encrypted in prod)
  token_expires_at      TIMESTAMPTZ,
  profile_picture_url   TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  connected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_account_id)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own social accounts" ON public.social_accounts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POST SCHEDULES
-- ============================================================
CREATE TABLE public.schedules (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  social_account_id   UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  -- Cron-style: days of week (0=Sun...6=Sat), times in HH:MM UTC
  days_of_week        INTEGER[] NOT NULL DEFAULT '{1,3,5}', -- Mon, Wed, Fri
  post_times          TEXT[] NOT NULL DEFAULT '{"09:00"}',  -- UTC times
  topics              TEXT[],                              -- Optional topic overrides
  platform_type       TEXT NOT NULL DEFAULT 'post' CHECK (platform_type IN ('post', 'reel', 'story')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own schedules" ON public.schedules
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POST LOGS (history of every published post)
-- ============================================================
CREATE TABLE public.post_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_id         UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
  social_account_id   UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  instagram_media_id  TEXT,                  -- Returned by Graph API
  caption             TEXT,
  image_url           TEXT,
  topic               TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  error_message       TEXT,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own post logs" ON public.post_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- INDEX for performance
-- ============================================================
CREATE INDEX idx_post_logs_user_id ON public.post_logs(user_id);
CREATE INDEX idx_post_logs_status ON public.post_logs(status);
CREATE INDEX idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX idx_social_accounts_user_id ON public.social_accounts(user_id);
