-- Añade la categoría y el servicio de creación de servidores de Discord.
-- El script es idempotente: puede ejecutarse más de una vez sin duplicar datos.

BEGIN;

ALTER TABLE public.services
    DROP CONSTRAINT IF EXISTS services_category_check;

ALTER TABLE public.services
    ADD CONSTRAINT services_category_check
    CHECK (category IN (
        'obs',
        'streaming',
        'pc_windows',
        'gaming',
        'discord',
        'design',
        'support',
        'custom'
    ));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.services
        WHERE slug = 'creacion-servidor-discord'
    ) THEN
        UPDATE public.services
        SET sort_order = sort_order + 1
        WHERE sort_order >= 3;
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
    duration_estimate,
    is_active,
    is_featured,
    sort_order,
    details
) VALUES (
    'Creación de Servidor de Discord',
    'creacion-servidor-discord',
    'Servidor de Discord profesional, seguro y organizado para tu comunidad o negocio',
    'discord',
    ARRAY[
        'Comunidad organizada',
        'Permisos seguros',
        'Moderación automatizada',
        'Experiencia profesional'
    ],
    ARRAY[
        'Estructura de canales',
        'Roles y permisos',
        'Sistema de bienvenida y reglas',
        'Bots, tickets y AutoMod',
        'Capacitación administrativa',
        '7 días de soporte'
    ],
    20.99,
    '2-4 días',
    true,
    true,
    3,
    'Creamos o reorganizamos tu servidor según el objetivo de tu comunidad. Configuramos canales, roles, permisos, bienvenida, reglas, moderación, tickets y bots existentes. No incluye desarrollo de bots personalizados ni suscripciones premium de terceros.'
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    benefits = EXCLUDED.benefits,
    includes = EXCLUDED.includes,
    price = EXCLUDED.price,
    duration_estimate = EXCLUDED.duration_estimate,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    sort_order = EXCLUDED.sort_order,
    details = EXCLUDED.details,
    updated_at = TIMEZONE('utc'::text, NOW());

COMMIT;
