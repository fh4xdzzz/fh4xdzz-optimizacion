-- Keep authorization helpers outside the Data API exposed schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'owner')
  )
$$;

REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "Authorized users can view order deliverables" ON public.order_deliverables;
CREATE POLICY "Authorized users can view order deliverables"
  ON public.order_deliverables FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_deliverables.order_id
        AND orders.user_id = (SELECT auth.uid())
    )
    OR (SELECT private.current_user_role()) IN ('admin', 'owner')
  );

DROP POLICY IF EXISTS "Owner can delete orders" ON public.orders;
CREATE POLICY "Owner can delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'owner');

DROP POLICY IF EXISTS "Owner can delete order events" ON public.order_events;
CREATE POLICY "Owner can delete order events"
  ON public.order_events FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) = 'owner');

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles"
  ON public.users FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
CREATE POLICY "Admins can update any profile"
  ON public.users FOR UPDATE TO authenticated
  USING ((SELECT private.is_admin()))
  WITH CHECK ((SELECT private.is_admin()));

DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.is_admin();

-- Trigger-only and unused privileged functions are not public RPC methods.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.has_role(UUID, TEXT) SET search_path = '';
ALTER FUNCTION public.is_staff_or_admin() SET search_path = '';
ALTER FUNCTION public.prevent_role_change() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_order_number() SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_ticket_number() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_last_message_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_first_response_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.calculate_resolution_time() SET search_path = pg_catalog, public;
ALTER FUNCTION public.cleanup_old_closed_chats() SET search_path = pg_catalog, public;
ALTER FUNCTION public.trigger_cleanup_on_new_chat() SET search_path = pg_catalog, public;

-- Future public functions require an explicit EXECUTE grant.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
