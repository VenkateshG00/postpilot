-- Phase 6 — Super Admin foundation. Additive & idempotent.

-- 1. Owner/admin flag on profiles (only admins can open /admin)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Make plans fully dynamic: drop the fixed CHECK on profiles.plan so the
--    Super Admin can add new plan keys and assign users to them.
alter table public.profiles drop constraint if exists profiles_plan_check;

-- 3. Make YOURSELF the super admin. Replace the email below with the email you
--    log into PostPilot with, then run this line. (Safe no-op if it doesn't match.)
update public.profiles set is_admin = true where email = 'REPLACE_WITH_YOUR_LOGIN_EMAIL';
