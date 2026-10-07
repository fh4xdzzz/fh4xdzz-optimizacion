begin;

-- One private profile per creator coupon. The public site only records visits
-- through a server route; creator finances remain service-role only.
create table if not exists public.affiliate_creators (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null unique references public.discount_coupons(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  slug text not null unique check (slug ~ '^[A-Z0-9]{3,20}$'),
  contact_email text,
  commission_rate numeric(5,2) not null default 10
    check (commission_rate >= 0 and commission_rate <= 50),
  status text not null default 'active'
    check (status in ('active', 'paused')),
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_affiliate_creators_status
  on public.affiliate_creators(status, created_at desc);

create table if not exists public.affiliate_visits (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.affiliate_creators(id) on delete cascade,
  visitor_id uuid not null,
  landing_path text not null default '/',
  referrer_host text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (creator_id, visitor_id)
);

create index if not exists idx_affiliate_visits_creator_created
  on public.affiliate_visits(creator_id, created_at desc);

create table if not exists public.affiliate_conversions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.affiliate_creators(id) on delete restrict,
  coupon_id uuid not null references public.discount_coupons(id) on delete restrict,
  payment_transaction_id uuid not null unique references public.payment_transactions(id) on delete restrict,
  gross_revenue numeric(10,2) not null check (gross_revenue >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  commission_rate numeric(5,2) not null check (commission_rate >= 0 and commission_rate <= 50),
  commission_amount numeric(10,2) not null check (commission_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_affiliate_conversions_creator_status
  on public.affiliate_conversions(creator_id, status, created_at desc);
create index if not exists idx_affiliate_conversions_coupon
  on public.affiliate_conversions(coupon_id);

alter table public.payment_transactions
  add column if not exists affiliate_creator_id uuid references public.affiliate_creators(id) on delete set null,
  add column if not exists affiliate_commission_rate numeric(5,2)
    check (affiliate_commission_rate is null or (affiliate_commission_rate >= 0 and affiliate_commission_rate <= 50)),
  add column if not exists coupon_redemption_recorded boolean not null default false;

create index if not exists idx_payment_transactions_affiliate_creator
  on public.payment_transactions(affiliate_creator_id)
  where affiliate_creator_id is not null;

create table if not exists public.affiliate_visit_rate_limits (
  fingerprint text primary key,
  attempts integer not null default 1 check (attempts > 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.affiliate_visit_rate_limits enable row level security;
revoke all on table public.affiliate_visit_rate_limits from public, anon, authenticated;
grant all on table public.affiliate_visit_rate_limits to service_role;

create or replace function public.claim_affiliate_visit(p_fingerprint text, p_limit integer default 30)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempts integer;
begin
  if char_length(p_fingerprint) <> 64 or p_limit < 1 or p_limit > 100 then
    return false;
  end if;

  insert into public.affiliate_visit_rate_limits (fingerprint)
  values (p_fingerprint)
  on conflict (fingerprint) do update
  set attempts = public.affiliate_visit_rate_limits.attempts + 1,
      updated_at = timezone('utc'::text, now())
  returning attempts into current_attempts;

  delete from public.affiliate_visit_rate_limits
  where created_at < timezone('utc'::text, now()) - interval '35 days';

  return current_attempts <= p_limit;
end;
$$;

revoke all on function public.claim_affiliate_visit(text, integer) from public, anon, authenticated;
grant execute on function public.claim_affiliate_visit(text, integer) to service_role;

alter table public.affiliate_creators enable row level security;
alter table public.affiliate_visits enable row level security;
alter table public.affiliate_conversions enable row level security;

revoke all on table public.affiliate_creators from public, anon, authenticated;
revoke all on table public.affiliate_visits from public, anon, authenticated;
revoke all on table public.affiliate_conversions from public, anon, authenticated;
grant all on table public.affiliate_creators to service_role;
grant all on table public.affiliate_visits to service_role;
grant all on table public.affiliate_conversions to service_role;

-- Finalize coupon usage and creator commission under one row lock. This makes
-- Stripe retries safe even if a previous webhook stopped after recording the
-- payment but before completing attribution.
create or replace function public.finalize_payment_attribution(p_payment_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment public.payment_transactions%rowtype;
  creator public.affiliate_creators%rowtype;
  effective_rate numeric(5,2);
begin
  select * into payment
  from public.payment_transactions
  where id = p_payment_transaction_id
  for update;

  if not found then
    raise exception 'Payment transaction not found';
  end if;

  if payment.coupon_id is not null and not payment.coupon_redemption_recorded then
    update public.discount_coupons
    set redemption_count = redemption_count + 1,
        updated_at = timezone('utc'::text, now())
    where id = payment.coupon_id;

    update public.payment_transactions
    set coupon_redemption_recorded = true
    where id = payment.id;
  end if;

  if not payment.livemode then
    return;
  end if;

  if payment.affiliate_creator_id is not null then
    select * into creator
    from public.affiliate_creators
    where id = payment.affiliate_creator_id;
  elsif payment.coupon_id is not null then
    select * into creator
    from public.affiliate_creators
    where coupon_id = payment.coupon_id and status = 'active';
  end if;

  if creator.id is null then
    return;
  end if;

  effective_rate := coalesce(payment.affiliate_commission_rate, creator.commission_rate);

  insert into public.affiliate_conversions (
    creator_id, coupon_id, payment_transaction_id, gross_revenue,
    discount_amount, commission_rate, commission_amount
  ) values (
    creator.id, creator.coupon_id, payment.id, payment.amount,
    payment.discount_amount, effective_rate,
    round(payment.amount * effective_rate / 100, 2)
  )
  on conflict (payment_transaction_id) do nothing;
end;
$$;

revoke all on function public.finalize_payment_attribution(uuid) from public, anon, authenticated;
grant execute on function public.finalize_payment_attribution(uuid) to service_role;

create or replace function public.update_affiliate_creator(
  p_creator_id uuid,
  p_display_name text,
  p_contact_email text,
  p_commission_rate numeric,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_creator public.affiliate_creators%rowtype;
begin
  select * into current_creator
  from public.affiliate_creators
  where id = p_creator_id
  for update;

  if not found then
    raise exception 'Affiliate creator not found';
  end if;

  if char_length(trim(p_display_name)) not between 2 and 80
    or p_commission_rate < 0 or p_commission_rate > 50
    or p_status not in ('active', 'paused') then
    raise exception 'Invalid affiliate profile';
  end if;

  update public.affiliate_creators
  set display_name = trim(p_display_name),
      contact_email = nullif(trim(p_contact_email), ''),
      commission_rate = p_commission_rate,
      status = p_status,
      updated_at = timezone('utc'::text, now())
  where id = p_creator_id;

  if current_creator.status is distinct from p_status then
    update public.discount_coupons
    set is_active = p_status = 'active',
        updated_at = timezone('utc'::text, now())
    where id = current_creator.coupon_id;
  end if;
end;
$$;

revoke all on function public.update_affiliate_creator(uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.update_affiliate_creator(uuid, text, text, numeric, text) to service_role;

-- Preserve creator coupons that already existed before the affiliate panel.
insert into public.affiliate_creators (coupon_id, display_name, slug)
select
  coupon.id,
  coupon.code,
  coupon.code
from public.discount_coupons coupon
where coupon.code ~ '^[A-Z0-9]{3,20}$'
  and coupon.description ilike 'Cupón del creador de contenido%'
on conflict (coupon_id) do nothing;

commit;
