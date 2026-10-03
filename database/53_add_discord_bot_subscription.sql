BEGIN;

ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'one_time',
    ADD COLUMN IF NOT EXISTS recurring_price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS billing_interval TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'services_billing_type_check'
          AND conrelid = 'public.services'::regclass
    ) THEN
        ALTER TABLE public.services
            ADD CONSTRAINT services_billing_type_check
            CHECK (billing_type IN ('one_time', 'subscription'));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'services_billing_configuration_check'
          AND conrelid = 'public.services'::regclass
    ) THEN
        ALTER TABLE public.services
            ADD CONSTRAINT services_billing_configuration_check
            CHECK (
                (billing_type = 'one_time' AND recurring_price IS NULL AND billing_interval IS NULL)
                OR
                (billing_type = 'subscription' AND recurring_price > 0 AND billing_interval = 'month')
            );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.service_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN (
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
    )),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_service_subscriptions_user_id
    ON public.service_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_service_id
    ON public.service_subscriptions(service_id);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_status
    ON public.service_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_service_subscriptions_order_id
    ON public.service_subscriptions(order_id);

DROP TRIGGER IF EXISTS update_service_subscriptions_updated_at ON public.service_subscriptions;
CREATE TRIGGER update_service_subscriptions_updated_at
    BEFORE UPDATE ON public.service_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.services
        WHERE slug = 'bot-de-discord'
    ) THEN
        UPDATE public.services
        SET sort_order = sort_order + 1
        WHERE sort_order >= 4;
    END IF;
END
$$;

INSERT INTO public.services (
    name,
    slug,
    description,
    category,
    benefits,
    includes,
    price,
    recurring_price,
    billing_type,
    billing_interval,
    duration_estimate,
    is_active,
    is_featured,
    sort_order,
    details
) VALUES (
    'Bot de Discord',
    'bot-de-discord',
    'Bot personalizado para automatizar, moderar y mejorar tu servidor, con alojamiento administrado 24/7',
    'discord',
    ARRAY[
        'Funciones personalizadas',
        'Automatización 24/7',
        'Alojamiento administrado',
        'Mantenimiento continuo'
    ],
    ARRAY[
        'Desarrollo y configuración inicial',
        'Comandos y automatizaciones acordadas',
        'Integración con tu servidor',
        'Despliegue en hosting administrado',
        'Monitoreo básico del bot',
        'Soporte para la puesta en marcha'
    ],
    30.99,
    9.99,
    'subscription',
    'month',
    '3-7 días',
    true,
    false,
    4,
    'El primer pago incluye $30.99 por la creación y configuración inicial del bot, más $9.99 por el primer mes de alojamiento. Después, el alojamiento se renueva automáticamente por $9.99 al mes hasta cancelar la suscripción.'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    benefits = EXCLUDED.benefits,
    includes = EXCLUDED.includes,
    price = EXCLUDED.price,
    recurring_price = EXCLUDED.recurring_price,
    billing_type = EXCLUDED.billing_type,
    billing_interval = EXCLUDED.billing_interval,
    duration_estimate = EXCLUDED.duration_estimate,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    details = EXCLUDED.details,
    updated_at = timezone('utc'::text, now());

COMMIT;
