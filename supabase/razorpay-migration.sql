-- ============================================================
-- PostPilot — Switch billing provider Stripe -> Razorpay
-- Run AFTER billing-migration.sql. Idempotent, safe to re-run.
-- Paste into Supabase SQL Editor and run.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='stripe_customer_id') THEN
    ALTER TABLE public.profiles RENAME COLUMN stripe_customer_id TO razorpay_customer_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE public.profiles RENAME COLUMN stripe_subscription_id TO razorpay_subscription_id;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_indexes
             WHERE schemaname='public' AND indexname='profiles_stripe_customer_id_key') THEN
    ALTER INDEX profiles_stripe_customer_id_key RENAME TO profiles_razorpay_customer_id_key;
  END IF;
END $$;

-- subscription_status, current_period_end and plan_expires_at are provider-neutral
-- and stay as they are. billing_events is reused unchanged.
