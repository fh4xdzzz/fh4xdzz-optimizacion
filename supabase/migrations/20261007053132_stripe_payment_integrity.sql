begin;

-- Stripe can deliver the same event more than once. This internal table lets
-- the webhook claim one delivery atomically and safely retry failed work.
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  processing_started_at timestamptz not null default timezone('utc'::text, now()),
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_stripe_webhook_events_status_started
  on public.stripe_webhook_events(status, processing_started_at);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant all on table public.stripe_webhook_events to service_role;

-- One row per confirmed charge. It is the financial source for live Stripe
-- analytics, including direct purchases and subscription renewals.
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  stripe_session_id text,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  user_id uuid references public.users(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  checkout_cart_id uuid references public.checkout_carts(id) on delete set null,
  coupon_id uuid references public.discount_coupons(id) on delete set null,
  payment_kind text not null
    check (payment_kind in ('one_time', 'subscription_initial', 'subscription_renewal')),
  livemode boolean not null,
  amount numeric(10,2) not null check (amount >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  currency text not null default 'usd',
  paid_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists idx_payment_transactions_invoice
  on public.payment_transactions(stripe_invoice_id)
  where stripe_invoice_id is not null;
create unique index if not exists idx_payment_transactions_session
  on public.payment_transactions(stripe_session_id)
  where stripe_session_id is not null;
create index if not exists idx_payment_transactions_paid_at
  on public.payment_transactions(paid_at desc);
create index if not exists idx_payment_transactions_service
  on public.payment_transactions(service_id)
  where service_id is not null;
create index if not exists idx_payment_transactions_coupon
  on public.payment_transactions(coupon_id)
  where coupon_id is not null;

alter table public.payment_transactions enable row level security;
revoke all on table public.payment_transactions from public, anon, authenticated;
grant all on table public.payment_transactions to service_role;

-- Store Stripe identifiers as structured data instead of searching free-form
-- notes. The composite index prevents duplicate cart item orders.
alter table public.orders
  add column if not exists stripe_session_id text,
  add column if not exists stripe_item_index integer,
  add column if not exists coupon_id uuid references public.discount_coupons(id) on delete set null,
  add column if not exists coupon_discount numeric(10,2) not null default 0
    check (coupon_discount >= 0);

create unique index if not exists idx_orders_stripe_session_item
  on public.orders(stripe_session_id, stripe_item_index)
  where stripe_session_id is not null;

-- Returns true only when this worker owns the event. Failed and stale claims
-- can be retried, while completed or actively-processing deliveries are ignored.
create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean := false;
begin
  insert into public.stripe_webhook_events (event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;

  if found then
    return true;
  end if;

  update public.stripe_webhook_events
  set status = 'processing',
      event_type = p_event_type,
      attempts = attempts + 1,
      last_error = null,
      processing_started_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where event_id = p_event_id
    and (
      status = 'failed'
      or (status = 'processing' and processing_started_at < timezone('utc'::text, now()) - interval '10 minutes')
    )
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.claim_stripe_webhook_event(text, text) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text) to service_role;

-- Incrementing in SQL avoids lost updates when two successful payments arrive
-- together. Event and transaction uniqueness prevents the same payment from
-- redeeming the coupon twice.
create or replace function public.increment_coupon_redemption(p_coupon_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.discount_coupons
  set redemption_count = redemption_count + 1,
      updated_at = timezone('utc'::text, now())
  where id = p_coupon_id;
$$;

revoke all on function public.increment_coupon_redemption(uuid) from public, anon, authenticated;
grant execute on function public.increment_coupon_redemption(uuid) to service_role;

commit;
