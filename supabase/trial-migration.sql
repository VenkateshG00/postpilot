-- 7-day trial for new signups (replaces the permanent free default).
-- Idempotent & additive. Safe to run on production.

-- 1. Add the trial plan to the dynamic plans table (Pro-level limits, price 0).
insert into public.plans
  (key, name, price_inr, channels_included, posts_per_day, credits_per_month,
   seats_included, allow_dalle, white_label, trial_days, analytics_level,
   extra_channel_price, extra_seat_price, is_active, sort_order)
values
  ('trial', 'Free Trial', 0, 3, 5, 300, 1, true, false, 7, 'full', 249, 0, true, 0)
on conflict (key) do update set
  name=excluded.name, price_inr=excluded.price_inr,
  channels_included=excluded.channels_included, posts_per_day=excluded.posts_per_day,
  credits_per_month=excluded.credits_per_month, seats_included=excluded.seats_included,
  allow_dalle=excluded.allow_dalle, white_label=excluded.white_label,
  trial_days=excluded.trial_days, analytics_level=excluded.analytics_level,
  is_active=excluded.is_active, updated_at=now();

-- 2. New signups start a 7-day trial instead of permanent free.
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
