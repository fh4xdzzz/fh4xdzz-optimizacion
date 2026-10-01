-- Elimina por completo la integración web de Dulcan Optimizer.
delete from storage.objects where bucket_id = 'optimizer-releases';
delete from storage.buckets where id = 'optimizer-releases';

drop function if exists public.consume_optimizer_code(text, text, text, jsonb);
drop table if exists public.optimizer_reports;
drop table if exists public.optimizer_access_codes;
drop table if exists public.optimizer_releases;
