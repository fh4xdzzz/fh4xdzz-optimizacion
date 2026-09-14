-- =====================================================
-- Agregar imágenes a los servicios
-- =====================================================

-- Actualizar servicios con imágenes de ejemplo
-- Puedes cambiar estas URLs por tus propias imágenes
UPDATE public.services 
SET image_url = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop'
WHERE slug = 'optimizacion-obs';

UPDATE public.services 
SET image_url = 'https://images.unsplash.com/photo-1593720219276-0b1eac0a9ef8?w=800&h=400&fit=crop'
WHERE slug = 'configuracion-streaming';

UPDATE public.services 
SET image_url = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&h=400&fit=crop'
WHERE slug = 'optimizacion-pc-windows';

UPDATE public.services 
SET image_url = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop'
WHERE slug = 'configuracion-gaming';

UPDATE public.services 
SET image_url = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=400&fit=crop'
WHERE slug = 'diseno-overlays-alertas';

UPDATE public.services 
SET image_url = 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=400&fit=crop'
WHERE slug = 'soporte-tecnico';

UPDATE public.services 
SET image_url = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&h=400&fit=crop'
WHERE slug = 'servicios-personalizados';

-- Agregar campo de detalles extendidos (opcional)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS details TEXT;

-- Agregar detalles a los servicios
UPDATE public.services 
SET details = 'Nuestro servicio de optimización de OBS te proporciona una configuración profesional ajustada a tu hardware y necesidades específicas. Optimizamos todos los parámetros para garantizar la mejor calidad posible sin sacrificar rendimiento. Incluye configuración de salida, escenas y fuentes, hotkeys personalizados y optimización de bitrate para tu tipo de contenido.'
WHERE slug = 'optimizacion-obs';

UPDATE public.services 
SET details = 'Configuramos todo tu ecosistema de streaming desde cero. Incluye setup de plataforma (Twitch, YouTube, Facebook Gaming), integración de alertas y widgets, chat en pantalla y un overlay profesional básico para que empieces a transmitir con calidad inmediata.'
WHERE slug = 'configuracion-streaming';

UPDATE public.services 
SET details = 'Optimizamos tu sistema Windows para máximo rendimiento. Eliminamos procesos innecesarios, configuramos el plan de energía para gaming, actualizamos drivers, realizamos una limpieza profunda del sistema y ajustamos configuraciones de red para reducir latencia en juegos.'
WHERE slug = 'optimizacion-pc-windows';

UPDATE public.services 
SET details = 'Optimizamos cada juego específicamente para tu hardware. Ajustamos gráficos, sensibilidad, controles, configuración de red y creamos perfiles de rendimiento para diferentes tipos de juegos. Ideal para FPS, MOBA, RPG y juegos competitivos.'
WHERE slug = 'configuracion-gaming';

UPDATE public.services 
SET details = 'Creamos elementos visuales personalizados que representan tu marca. Incluye overlay principal, alertas animadas de follower/sub/donation, screens de intermission (BRB, Starting, Be Thankful) y todo lo necesario para un stream visualmente profesional y único.'
WHERE slug = 'diseno-overlays-alertas';

UPDATE public.services 
SET details = 'Resolvemos cualquier problema técnico que tengas con tu setup de streaming, gaming o sistema. Nuestros expertos te guían paso a paso, implementan la solución y te enseñan a prevenir problemas futuros. Soporte disponible por Discord, email o video llamada.'
WHERE slug = 'soporte-tecnico';

UPDATE public.services 
SET details = 'Si necesitas algo que no está en nuestro catálogo estándar, podemos crear una solución personalizada para ti. Desde configuraciones complejas hasta integraciones específicas, desarrollos personalizados y consultoría especializada. Contáctanos para discutir tu proyecto único.'
WHERE slug = 'servicios-personalizados';
