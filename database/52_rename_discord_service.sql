-- Simplifica el nombre visible del servicio de Discord.

UPDATE public.services
SET
    name = 'Servidor de Discord',
    updated_at = TIMEZONE('utc'::text, NOW())
WHERE slug = 'creacion-servidor-discord';
