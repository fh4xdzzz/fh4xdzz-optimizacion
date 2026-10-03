BEGIN;

CREATE INDEX IF NOT EXISTS idx_service_subscriptions_order_id
    ON public.service_subscriptions(order_id);

DROP POLICY IF EXISTS "Clients can view own subscriptions" ON public.service_subscriptions;
DROP POLICY IF EXISTS "Staff can view all subscriptions" ON public.service_subscriptions;
DROP POLICY IF EXISTS "Users can view allowed subscriptions" ON public.service_subscriptions;

CREATE POLICY "Users can view allowed subscriptions"
    ON public.service_subscriptions
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
              AND users.role IN ('admin', 'staff', 'owner')
        )
    );

COMMIT;
