begin;

insert into public.services (
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
) values
(
  'Edición de Video',
  'edicion-de-video',
  'Edición profesional para YouTube, redes sociales y contenido de marca, con un acabado dinámico y listo para publicar.',
  'design',
  array['Ritmo profesional', 'Imagen y audio mejorados', 'Contenido listo para publicar', 'Estilo adaptado a tu marca'],
  array['Edición de hasta 10 minutos', 'Cortes y transiciones', 'Música y ajuste de audio', 'Corrección básica de color', 'Exportación optimizada'],
  39.99,
  null,
  'one_time',
  null,
  '2-4 días',
  true,
  false,
  8,
  'Editamos un video de hasta 10 minutos con cortes, transiciones, música, ajuste de audio, corrección básica de color y exportación optimizada para la plataforma donde publicarás.'
),
(
  'Editor de Video Mensual',
  'editor-de-video-mensual',
  'Edición continua para creadores y marcas que necesitan publicar con constancia cada mes.',
  'design',
  array['Editor disponible cada mes', 'Estilo visual consistente', 'Entregas planificadas', 'Acompañamiento continuo'],
  array['Hasta 4 videos al mes', 'Hasta 10 minutos por video', 'Miniatura básica por video', 'Dos revisiones por video', 'Exportación optimizada'],
  0.00,
  149.99,
  'subscription',
  'month',
  'Plan mensual',
  true,
  false,
  9,
  'La suscripción incluye hasta 4 videos al mes de hasta 10 minutos cada uno, una miniatura básica y dos rondas de revisión por video. Se renueva automáticamente por $149.99 al mes hasta cancelar.'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  benefits = excluded.benefits,
  includes = excluded.includes,
  price = excluded.price,
  recurring_price = excluded.recurring_price,
  billing_type = excluded.billing_type,
  billing_interval = excluded.billing_interval,
  duration_estimate = excluded.duration_estimate,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  details = excluded.details,
  updated_at = timezone('utc'::text, now());

commit;
