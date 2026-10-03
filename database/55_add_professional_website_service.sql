BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.services
    WHERE slug = 'pagina-web-profesional'
  ) THEN
    UPDATE public.services
    SET sort_order = sort_order + 1
    WHERE sort_order >= 9;
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
  details,
  billing_type,
  recurring_price,
  billing_interval
)
VALUES (
  'Página web profesional',
  'pagina-web-profesional',
  'Página web moderna, adaptable y lista para presentar tu marca, negocio o proyecto',
  'custom',
  ARRAY['Diseño adaptable', 'Imagen profesional', 'Carga optimizada', 'Lista para publicar'],
  ARRAY['Diseño de hasta 5 secciones', 'Adaptación para móvil y escritorio', 'Formulario de contacto', 'Enlaces a redes sociales', 'Configuración SEO básica', 'Publicación inicial'],
  99.99,
  '5-10 días',
  true,
  false,
  9,
  'Crearemos una página informativa profesional de hasta 5 secciones para presentar tu marca, negocio o proyecto. El precio incluye diseño, desarrollo y publicación inicial. El dominio, el plan de hosting, las licencias, los servicios premium y el mantenimiento continuo se pagan por separado por el cliente.',
  'one_time',
  NULL,
  NULL
)
ON CONFLICT (slug) DO UPDATE
SET
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
  billing_type = EXCLUDED.billing_type,
  recurring_price = EXCLUDED.recurring_price,
  billing_interval = EXCLUDED.billing_interval,
  updated_at = timezone('utc'::text, now());

COMMIT;
