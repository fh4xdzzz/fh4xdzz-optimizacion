begin;

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  discount_percent numeric(5,2) not null check (discount_percent > 0 and discount_percent <= 80),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_package_items (
  package_id uuid not null references public.service_packages(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (package_id, service_id)
);

create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  minimum_amount numeric(10,2) not null default 0 check (minimum_amount >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at is null or starts_at is null or expires_at > starts_at),
  check (discount_type <> 'percent' or discount_value <= 80)
);

create table if not exists public.checkout_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_discord text,
  description text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 10),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  package_discount numeric(10,2) not null default 0 check (package_discount >= 0),
  coupon_discount numeric(10,2) not null default 0 check (coupon_discount >= 0),
  total numeric(10,2) not null check (total >= 0),
  package_id uuid references public.service_packages(id) on delete set null,
  coupon_id uuid references public.discount_coupons(id) on delete set null,
  stripe_session_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  paid_at timestamptz
);

create index if not exists idx_package_items_service on public.service_package_items(service_id);
create index if not exists idx_checkout_carts_user_created on public.checkout_carts(user_id, created_at desc);
create index if not exists idx_checkout_carts_status on public.checkout_carts(status);
create index if not exists idx_checkout_carts_package on public.checkout_carts(package_id) where package_id is not null;
create index if not exists idx_checkout_carts_coupon on public.checkout_carts(coupon_id) where coupon_id is not null;
create unique index if not exists idx_checkout_carts_stripe_session on public.checkout_carts(stripe_session_id) where stripe_session_id is not null;

alter table public.service_packages enable row level security;
alter table public.service_package_items enable row level security;
alter table public.discount_coupons enable row level security;
alter table public.checkout_carts enable row level security;

drop policy if exists "Public can view active packages" on public.service_packages;
create policy "Public can view active packages" on public.service_packages for select to anon, authenticated using (is_active = true);
drop policy if exists "Public can view active package items" on public.service_package_items;
create policy "Public can view active package items" on public.service_package_items for select to anon, authenticated using (exists (select 1 from public.service_packages p where p.id = package_id and p.is_active));
drop policy if exists "Users can view own checkout carts" on public.checkout_carts;
create policy "Users can view own checkout carts" on public.checkout_carts for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.service_packages, public.service_package_items to anon, authenticated;
grant select on public.checkout_carts to authenticated;
revoke all on public.discount_coupons from anon, authenticated;

insert into public.service_packages (name, slug, description, discount_percent, sort_order)
values ('Streamer completo', 'streamer-completo', 'OBS optimizado, configuración de streaming y diseño visual en una sola compra.', 15, 1)
on conflict (slug) do update set description = excluded.description, discount_percent = excluded.discount_percent, is_active = true;

insert into public.service_package_items (package_id, service_id)
select p.id, s.id from public.service_packages p cross join public.services s
where p.slug = 'streamer-completo' and s.slug in ('optimizacion-obs', 'configuracion-streaming', 'diseno-overlays-alertas')
on conflict do nothing;

commit;
