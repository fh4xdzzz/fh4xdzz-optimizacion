-- Keep the public catalog readable without exposing the users table.
-- The previous admin SELECT policy applied to anon as well, so Postgres tried
-- to read public.users for signed-out visitors and rejected the whole query.

grant usage on schema public to anon, authenticated;
grant select on table public.services to anon, authenticated;
grant insert, update, delete on table public.services to authenticated;
revoke insert, update, delete on table public.services from anon;

alter table public.services enable row level security;

drop policy if exists "Anyone can view active services" on public.services;
drop policy if exists "Admins can view all services" on public.services;
drop policy if exists "Admins can create services" on public.services;
drop policy if exists "Admins can update services" on public.services;
drop policy if exists "Admins can delete services" on public.services;

create policy "Anyone can view active services"
on public.services
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can view all services"
on public.services
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role in ('admin', 'owner')
  )
);

create policy "Admins can create services"
on public.services
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role in ('admin', 'owner')
  )
);

create policy "Admins can update services"
on public.services
for update
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role in ('admin', 'owner')
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role in ('admin', 'owner')
  )
);

create policy "Admins can delete services"
on public.services
for delete
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role in ('admin', 'owner')
  )
);
