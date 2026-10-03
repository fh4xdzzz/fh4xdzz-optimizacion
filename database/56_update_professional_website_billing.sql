BEGIN;

UPDATE public.services
SET
  price = 80.99,
  billing_type = 'subscription',
  recurring_price = 5.99,
  billing_interval = 'month',
  benefits = ARRAY['Diseño adaptable', 'Imagen profesional', 'Carga optimizada', 'Dominio y hosting administrados'],
  details = 'Crearemos una página informativa profesional de hasta 5 secciones para presentar tu marca, negocio o proyecto. El pago inicial incluye diseño, desarrollo y publicación. El plan de $5.99 al mes incluye dominio, hosting y mantenimiento técnico básico, y se renueva automáticamente hasta cancelar. Las licencias e integraciones premium se cotizan por separado.',
  updated_at = timezone('utc'::text, now())
WHERE slug = 'pagina-web-profesional';

COMMIT;
