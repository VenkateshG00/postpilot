-- Add storage_auto_delete_hours to app_settings
-- Run this in Supabase SQL Editor

ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS storage_auto_delete_hours integer DEFAULT 24;

-- 24 = delete 24hrs after posting (default)
-- 48 = delete 2 days after posting
-- 168 = delete 1 week after posting
-- 0 = disabled (no auto-delete)
