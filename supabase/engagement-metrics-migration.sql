-- PostPilot — Engagement Metrics Migration
-- Adds Instagram Insights columns to post_logs.
-- Run once in Supabase SQL Editor.

ALTER TABLE public.post_logs
  ADD COLUMN IF NOT EXISTS likes_count         INTEGER,
  ADD COLUMN IF NOT EXISTS comments_count      INTEGER,
  ADD COLUMN IF NOT EXISTS reach               INTEGER,
  ADD COLUMN IF NOT EXISTS impressions         INTEGER,
  ADD COLUMN IF NOT EXISTS saves               INTEGER,
  ADD COLUMN IF NOT EXISTS metrics_fetched_at  TIMESTAMPTZ;

-- Index for quickly finding posts that need a metrics refresh.
CREATE INDEX IF NOT EXISTS post_logs_metrics_idx
  ON public.post_logs (user_id, status, ig_media_id)
  WHERE status = 'published' AND ig_media_id IS NOT NULL;
