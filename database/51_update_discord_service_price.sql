-- Actualiza el precio del servicio de creación de servidores de Discord.

UPDATE public.services
SET
    price = 20.99,
    updated_at = TIMEZONE('utc'::text, NOW())
WHERE slug = 'creacion-servidor-discord';
