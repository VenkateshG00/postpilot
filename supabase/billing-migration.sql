-- ============================================================
-- PostPilot — Billing / Stripe Migration (Phase 4)
-- Idempotent. Paste into Supabase SQL Editor (Dashboard > SQL Editor) and run.
-- Safe to re-run: every statement guards against "already exists".
-- ============================================================

-- 1) Stripe columns on profiles ------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ;

-- Unique Stripe customer id (partial: only when set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'profiles_stripe_customer_id_key'
  ) THEN
    CREATE UNIQUE INDEX profiles_stripe_customer_id_key
      ON public.profiles (stripe_customer_id)
      WHERE stripe_customer_id IS NOT NULL;
  END IF;
END $$;

-- 2) billing_events — webhook idempotency + audit ------------
-- The webhook checks this table by Stripe event id before acting,
-- so a re-delivered event is processed at most once.
CREATE TABLE IF NOT EXISTS public.billing_events (
  id          TEXT PRIMARY KEY,          -- Stripe event id (evt_...)
  type        TEXT NOT NULL,             -- e.g. checkout.session.completed
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS on, no policies: only the service-role key (the webhook) touches it.
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- 3) posts_today() — count of a user's posts "today" in IST --
-- Used by plan gating in the cron route (called via PostgREST RPC).
-- Excludes 'failed' so a publish failure or a skipped-over-limit row
-- does not burn the user's daily quota.
CREATE OR REPLACE FUNCTION public.posts_today(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.post_logs
  WHERE user_id = p_user_id
    AND status <> 'failed'
    AND created_at >= (date_trunc('day', (NOW() AT TIME ZONE 'Asia/Kolkata')) AT TIME ZONE 'Asia/Kolkata');
$$;

-- Allow the API roles to call it via RPC.
GRANT EXECUTE ON FUNCTION public.posts_today(UUID) TO anon, authenticated, service_role;

-- Helpful index for the count above.
CREATE INDEX IF NOT EXISTS idx_post_logs_user_created
  ON public.post_logs (user_id, created_at);
