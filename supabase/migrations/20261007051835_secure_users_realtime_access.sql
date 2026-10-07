-- Remove the broad Realtime workaround that exposed every profile to every
-- authenticated account. Realtime follows the same row-level policies as
-- normal SELECT queries, so users only need access to their own profile.
drop policy if exists "Allow authenticated users to read users for realtime"
  on public.users;

drop policy if exists "Users can view own profile"
  on public.users;

create policy "Users can view own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

revoke select on table public.users from anon;
grant select on table public.users to authenticated;
