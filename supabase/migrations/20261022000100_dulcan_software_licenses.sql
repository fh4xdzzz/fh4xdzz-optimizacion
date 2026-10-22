-- Permanent one-PC licenses. Private tables: no browser/anon/authenticated grants.
-- Additive migration; existing service orders and payment flows are unchanged.
create table if not exists public.software_products (
 id text primary key, name text not null, amount_cents integer not null check(amount_cents between 50 and 10000000),
 currency text not null check(currency='usd'), active boolean not null default false,
 created_at timestamptz not null default now()
);
insert into public.software_products(id,name,amount_cents,currency,active)
values('dulcan-optimizer','Dulcan Optimizer · Permanente para 1 PC',1499,'usd',true) on conflict(id) do nothing;
create table if not exists public.software_purchases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id),
 product_id text not null references public.software_products(id), email text not null, customer_name text not null,
 amount_cents integer not null check(amount_cents>0), currency text not null, livemode boolean not null,
 stripe_session_id text unique, payment_intent_id text unique,
 status text not null default 'pending' check(status in('pending','paid','refunded')),
 created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.software_licenses (
 id uuid primary key default gen_random_uuid(), purchase_id uuid not null unique references public.software_purchases(id),
 user_id uuid not null references public.users(id), product_id text not null references public.software_products(id),
 key_hash text not null unique check(key_hash~'^[a-f0-9]{64}$'), key_ciphertext text not null,
 status text not null default 'active' check(status in('active','revoked')), livemode boolean not null,
 device_hash text check(device_hash is null or device_hash~'^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), activated_at timestamptz, last_verified_at timestamptz, email_sent_at timestamptz
);
create index if not exists software_licenses_user_idx on public.software_licenses(user_id,created_at desc);
create table if not exists public.software_payment_revocations(payment_intent_id text primary key, created_at timestamptz not null default now());
create table if not exists public.software_activation_limits(scope_hash text primary key, window_start timestamptz not null, attempts integer not null);
create index if not exists software_activation_limits_window_idx on public.software_activation_limits(window_start);
alter table public.software_products enable row level security;
alter table public.software_purchases enable row level security;
alter table public.software_licenses enable row level security;
alter table public.software_payment_revocations enable row level security;
alter table public.software_activation_limits enable row level security;
revoke all on public.software_products,public.software_purchases,public.software_licenses,public.software_payment_revocations,public.software_activation_limits from public,anon,authenticated;
grant select,insert,update,delete on public.software_products,public.software_purchases,public.software_licenses,public.software_payment_revocations,public.software_activation_limits to service_role;

create or replace function public.issue_dulcan_license(p_purchase_id uuid,p_session_id text,p_payment_intent text,p_paid_amount integer,p_currency text,p_live boolean,p_key_hash text,p_key_ciphertext text)
returns setof public.software_licenses language plpgsql security definer set search_path='' as $$
declare purchase public.software_purchases; license public.software_licenses;
begin
 if p_payment_intent is null or p_payment_intent !~ '^pi_[A-Za-z0-9]+$' then raise exception 'Invalid payment reference'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_payment_intent,0));
 select * into purchase from public.software_purchases where id=p_purchase_id for update;
 if not found or purchase.stripe_session_id is distinct from p_session_id or purchase.amount_cents is distinct from p_paid_amount or purchase.currency is distinct from p_currency or purchase.livemode is distinct from p_live then raise exception 'Payment does not match purchase'; end if;
 if purchase.status='refunded' or exists(select 1 from public.software_payment_revocations where payment_intent_id=p_payment_intent) then
  update public.software_purchases set status='refunded',payment_intent_id=p_payment_intent where id=p_purchase_id;
  update public.software_licenses set status='revoked' where purchase_id=p_purchase_id;
  return;
 end if;
 select * into license from public.software_licenses where purchase_id=p_purchase_id;
 if found then return next license;return;end if;
 insert into public.software_licenses(purchase_id,user_id,product_id,key_hash,key_ciphertext,livemode)
 values(purchase.id,purchase.user_id,purchase.product_id,p_key_hash,p_key_ciphertext,p_live) returning * into license;
 update public.software_purchases set status='paid',payment_intent_id=p_payment_intent,paid_at=now() where id=p_purchase_id;
 return next license;
end;$$;

create or replace function public.revoke_dulcan_payment(p_payment_intent text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_payment_intent is null or p_payment_intent !~ '^pi_[A-Za-z0-9]+$' then raise exception 'Invalid payment reference';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_payment_intent,0));
 insert into public.software_payment_revocations(payment_intent_id) values(p_payment_intent) on conflict do nothing;
 update public.software_purchases set status='refunded' where payment_intent_id=p_payment_intent;
 update public.software_licenses set status='revoked' where purchase_id in(select id from public.software_purchases where payment_intent_id=p_payment_intent);
end;$$;

create or replace function public.consume_dulcan_activation_limit(p_scope text,p_limit integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare used integer;begin
 if p_scope is null or p_limit is null or p_scope !~ '^[a-f0-9]{64}$' or p_limit<1 or p_limit>100 then return false;end if;
 delete from public.software_activation_limits where window_start<now()-interval '1 day';
 insert into public.software_activation_limits(scope_hash,window_start,attempts) values(p_scope,date_trunc('minute',now()),1)
 on conflict(scope_hash) do update set attempts=case when software_activation_limits.window_start<date_trunc('minute',now()) then 1 else least(software_activation_limits.attempts+1,1000) end,window_start=date_trunc('minute',now()) returning attempts into used;
 return used<=p_limit;
end;$$;

create or replace function public.activate_dulcan_license(p_key_hash text,p_device_hash text,p_live boolean)
returns table(license_id uuid,device_hash text,activated_at timestamptz,result text)
language plpgsql security definer set search_path='' as $$
declare license public.software_licenses;begin
 if p_key_hash is null or p_device_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' or p_device_hash !~ '^[a-f0-9]{64}$' then return query select null::uuid,null::text,null::timestamptz,'unavailable'::text;return;end if;
 select * into license from public.software_licenses where key_hash=p_key_hash for update;
 if not found or license.status<>'active' or license.livemode is distinct from p_live then return query select null::uuid,null::text,null::timestamptz,'unavailable'::text;return;end if;
 if license.device_hash is not null and license.device_hash<>p_device_hash then return query select null::uuid,null::text,null::timestamptz,'device_limit'::text;return;end if;
 update public.software_licenses as l set device_hash=p_device_hash,activated_at=coalesce(l.activated_at,now()),last_verified_at=now() where l.id=license.id returning l.* into license;
 return query select license.id,license.device_hash,license.activated_at,'active'::text;
end;$$;

revoke all on function public.issue_dulcan_license(uuid,text,text,integer,text,boolean,text,text),public.revoke_dulcan_payment(text),public.consume_dulcan_activation_limit(text,integer),public.activate_dulcan_license(text,text,boolean) from public,anon,authenticated;
grant execute on function public.issue_dulcan_license(uuid,text,text,integer,text,boolean,text,text),public.revoke_dulcan_payment(text),public.consume_dulcan_activation_limit(text,integer),public.activate_dulcan_license(text,text,boolean) to service_role;