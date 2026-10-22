begin;

create table public.store_products (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null check (char_length(description) between 10 and 2000),
  category text not null default 'General' check (char_length(category) between 2 and 60),
  price numeric(10,2) not null check (price > 0 and price <= 100000),
  image_url text,
  product_type text not null default 'digital' check (product_type in ('digital', 'physical')),
  inventory_count integer check (inventory_count is null or inventory_count >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text not null check (char_length(customer_email) between 5 and 320),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  total numeric(10,2) not null check (total >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded')),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  livemode boolean,
  shipping_details jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index store_products_public_catalog_idx
  on public.store_products (is_featured desc, sort_order, created_at desc)
  where is_active = true;
create index store_orders_status_created_idx
  on public.store_orders (status, created_at desc);
create index store_orders_customer_email_idx
  on public.store_orders (lower(customer_email), created_at desc);
create unique index store_orders_stripe_session_idx
  on public.store_orders (stripe_session_id)
  where stripe_session_id is not null;

alter table public.store_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_products force row level security;
alter table public.store_orders force row level security;

revoke all on table public.store_products from anon, authenticated;
revoke all on table public.store_orders from anon, authenticated;
revoke all on sequence public.store_products_id_seq from anon, authenticated;

drop policy if exists "No direct public product access" on public.store_products;
create policy "No direct public product access"
  on public.store_products for all to anon, authenticated
  using (false) with check (false);

drop policy if exists "No direct public store order access" on public.store_orders;
create policy "No direct public store order access"
  on public.store_orders for all to anon, authenticated
  using (false) with check (false);

create or replace function public.finalize_store_order(
  p_order_id uuid,
  p_stripe_session_id text,
  p_payment_intent_id text,
  p_livemode boolean,
  p_shipping_details jsonb,
  p_paid_at timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_items jsonb;
  current_status text;
  item jsonb;
  requested_quantity integer;
begin
  select items, status into order_items, current_status
  from public.store_orders
  where id = p_order_id and stripe_session_id = p_stripe_session_id
  for update;

  if not found then
    raise exception 'Store order not found';
  end if;
  if current_status = 'paid' then
    return false;
  end if;

  for item in select value from jsonb_array_elements(order_items)
  loop
    requested_quantity := greatest(1, (item->>'quantity')::integer);
    update public.store_products
    set inventory_count = inventory_count - requested_quantity,
        updated_at = p_paid_at
    where id = (item->>'id')::bigint
      and inventory_count is not null
      and inventory_count >= requested_quantity;

    if found then
      continue;
    end if;

    if exists (
      select 1 from public.store_products
      where id = (item->>'id')::bigint and inventory_count is not null
    ) then
      raise exception 'Insufficient inventory for product %', item->>'id';
    end if;
  end loop;

  update public.store_orders
  set status = 'paid',
      stripe_payment_intent_id = p_payment_intent_id,
      livemode = p_livemode,
      shipping_details = p_shipping_details,
      paid_at = p_paid_at,
      updated_at = p_paid_at
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.finalize_store_order(uuid, text, text, boolean, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.finalize_store_order(uuid, text, text, boolean, jsonb, timestamptz) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-products',
  'store-products',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.store_products is 'Productos públicos administrados exclusivamente por el Owner.';
comment on table public.store_orders is 'Compras de productos realizadas por clientes invitados mediante Stripe.';

commit;
