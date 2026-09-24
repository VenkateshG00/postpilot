-- Custom-brief posts: atomic credit spend + grant trial credits at signup.
-- Idempotent & additive. Safe to run on production.

-- Atomically deduct credits; returns the new balance, or NULL if insufficient.
-- Spending a negative amount (e.g. -1) refunds.
create or replace function public.spend_credits(p_user_id uuid, p_amount int)
returns int language plpgsql security definer set search_path = public as $$
declare new_balance int;
begin
  update public.profiles set credits_balance = credits_balance - p_amount
    where id = p_user_id and credits_balance >= p_amount
    returning credits_balance into new_balance;
  return new_balance;
end; $$;

-- New signups (trial) start with the trial's included AI credits.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, plan, plan_expires_at, credits_balance)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'trial', now() + interval '7 days', 300
  );
  return new;
end; $$;

-- Give existing trial users their credits if they have none yet.
update public.profiles set credits_balance = 300 where plan = 'trial' and coalesce(credits_balance,0) = 0;
