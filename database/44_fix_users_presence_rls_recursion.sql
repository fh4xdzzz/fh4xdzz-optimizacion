-- Avoid querying public.users from a policy attached to public.users.
-- The private helper performs the same admin/owner check without recursive RLS evaluation.

alter policy admin_update_agent_status
  on public.users
  using ((select private.is_admin()))
  with check ((select private.is_admin()));


