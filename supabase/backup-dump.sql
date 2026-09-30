-- ============================================================
-- Run this in Supabase SQL Editor to export ALL your data
-- Copy the entire output — that's your backup
-- ============================================================

-- 1. PROFILES
SELECT '-- ═══ PROFILES (' || count(*) || ' rows) ═══' FROM profiles;
SELECT '-- Table: profiles';
SELECT 'CREATE TABLE IF NOT EXISTS profiles_backup AS SELECT * FROM profiles;';

-- Generate INSERT statements for profiles
SELECT 
  'INSERT INTO profiles (id, email, full_name, avatar_url, plan, plan_expires_at, created_at, updated_at, razorpay_customer_id, razorpay_subscription_id, subscription_status, current_period_end, credits_balance, is_admin, is_suspended, brand_name, brand_logo_url, brand_color) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(COALESCE(email, '')) || ', ' ||
  quote_literal(COALESCE(full_name, '')) || ', ' ||
  quote_nullable(avatar_url) || ', ' ||
  quote_nullable(plan) || ', ' ||
  quote_nullable(plan_expires_at::text) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  quote_nullable(razorpay_customer_id) || ', ' ||
  quote_nullable(razorpay_subscription_id) || ', ' ||
  quote_nullable(subscription_status) || ', ' ||
  quote_nullable(current_period_end::text) || ', ' ||
  COALESCE(credits_balance::text, '0') || ', ' ||
  COALESCE(is_admin::text, 'false') || ', ' ||
  COALESCE(is_suspended::text, 'false') || ', ' ||
  quote_nullable(brand_name) || ', ' ||
  quote_nullable(brand_logo_url) || ', ' ||
  quote_nullable(brand_color) ||
  ');'
FROM profiles;

-- 2. BUSINESS_PROFILES
SELECT '-- ═══ BUSINESS_PROFILES ═══';
SELECT 
  'INSERT INTO business_profiles (id, user_id, business_name, industry, description, target_audience, brand_voice, topics, hashtags, language, timezone, created_at, updated_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(user_id::text) || ', ' ||
  quote_nullable(business_name) || ', ' ||
  quote_nullable(industry) || ', ' ||
  quote_nullable(description) || ', ' ||
  quote_nullable(target_audience) || ', ' ||
  quote_nullable(brand_voice) || ', ' ||
  quote_nullable(topics::text) || ', ' ||
  quote_nullable(hashtags::text) || ', ' ||
  quote_nullable(language) || ', ' ||
  quote_nullable(timezone) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ');'
FROM business_profiles;

-- 3. SOCIAL_ACCOUNTS
SELECT '-- ═══ SOCIAL_ACCOUNTS ═══';
SELECT 
  'INSERT INTO social_accounts (id, user_id, platform, account_id, account_name, account_picture_url, access_token, token_expires_at, page_id, ig_business_id, is_active, connected_at, client_label, require_approval) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(user_id::text) || ', ' ||
  quote_nullable(platform) || ', ' ||
  quote_nullable(account_id) || ', ' ||
  quote_nullable(account_name) || ', ' ||
  quote_nullable(account_picture_url) || ', ' ||
  quote_nullable(access_token) || ', ' ||
  quote_nullable(token_expires_at::text) || ', ' ||
  quote_nullable(page_id) || ', ' ||
  quote_nullable(ig_business_id) || ', ' ||
  COALESCE(is_active::text, 'true') || ', ' ||
  quote_nullable(connected_at::text) || ', ' ||
  quote_nullable(client_label) || ', ' ||
  COALESCE(require_approval::text, 'false') ||
  ');'
FROM social_accounts;

-- 4. SCHEDULES
SELECT '-- ═══ SCHEDULES ═══';
SELECT 
  'INSERT INTO schedules (id, user_id, social_account_id, name, is_active, frequency, post_times, days_of_week, content_type, custom_topics, created_at, updated_at, topics) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(user_id::text) || ', ' ||
  quote_nullable(social_account_id::text) || ', ' ||
  quote_nullable(name) || ', ' ||
  COALESCE(is_active::text, 'true') || ', ' ||
  quote_nullable(frequency) || ', ' ||
  quote_nullable(post_times::text) || ', ' ||
  quote_nullable(days_of_week::text) || ', ' ||
  quote_nullable(content_type) || ', ' ||
  quote_nullable(custom_topics) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) || ', ' ||
  quote_nullable(topics::text) ||
  ');'
FROM schedules;

-- 5. POST_LOGS
SELECT '-- ═══ POST_LOGS (' || count(*) || ' rows) ═══' FROM post_logs;
SELECT 
  'INSERT INTO post_logs (id, user_id, schedule_id, social_account_id, platform, status, caption, image_url, ig_media_url, ig_permalink, error_message, topic_used, scheduled_at, published_at, created_at, likes_count, comments_count, reach, impressions, saved) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_literal(user_id::text) || ', ' ||
  quote_nullable(schedule_id::text) || ', ' ||
  quote_nullable(social_account_id::text) || ', ' ||
  quote_nullable(platform) || ', ' ||
  quote_nullable(status) || ', ' ||
  quote_nullable(caption) || ', ' ||
  quote_nullable(image_url) || ', ' ||
  quote_nullable(ig_media_url) || ', ' ||
  quote_nullable(ig_permalink) || ', ' ||
  quote_nullable(error_message) || ', ' ||
  quote_nullable(topic_used) || ', ' ||
  quote_nullable(scheduled_at::text) || ', ' ||
  quote_nullable(published_at::text) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  COALESCE(likes_count::text, '0') || ', ' ||
  COALESCE(comments_count::text, '0') || ', ' ||
  COALESCE(reach::text, '0') || ', ' ||
  COALESCE(impressions::text, '0') || ', ' ||
  COALESCE(saved::text, '0') ||
  ');'
FROM post_logs;

-- 6. PLANS
SELECT '-- ═══ PLANS ═══';
SELECT 
  'INSERT INTO plans (key, name, price_monthly, channels_included, posts_per_month, credits_per_month, seats_included, allow_dashboard) VALUES (' ||
  quote_literal(key) || ', ' ||
  quote_nullable(name) || ', ' ||
  COALESCE(price_monthly::text, '0') || ', ' ||
  COALESCE(channels_included::text, '0') || ', ' ||
  COALESCE(posts_per_month::text, '0') || ', ' ||
  COALESCE(credits_per_month::text, '0') || ', ' ||
  COALESCE(seats_included::text, '0') || ', ' ||
  COALESCE(allow_dashboard::text, 'false') ||
  ');'
FROM plans;

-- 7. BILLING_EVENTS
SELECT '-- ═══ BILLING_EVENTS ═══';
SELECT 
  'INSERT INTO billing_events (id, type, user_id, payload, created_at) VALUES (' ||
  quote_literal(id::text) || ', ' ||
  quote_nullable(type) || ', ' ||
  quote_nullable(user_id::text) || ', ' ||
  quote_nullable(payload::text) || ', ' ||
  quote_literal(created_at::text) ||
  ');'
FROM billing_events;

-- 8. APP_SETTINGS
SELECT '-- ═══ APP_SETTINGS ═══';
SELECT 'SELECT * FROM app_settings;';

SELECT '-- ═══ BACKUP COMPLETE ═══';
