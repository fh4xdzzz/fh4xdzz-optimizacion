-- Elimina por completo la integración web de Dulcan Optimizer.
-- El bucket optimizer-releases y sus archivos deben eliminarse primero mediante
-- la API o el panel de Storage; Supabase bloquea eliminarlos con SQL directo.

drop function if exists public.consume_optimizer_code(text, text, text, jsonb);
drop table if exists public.optimizer_reports;
drop table if exists public.optimizer_access_codes;
drop table if exists public.optimizer_releases;
