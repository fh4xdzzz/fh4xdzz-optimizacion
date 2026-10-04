-- Live order details and private resumable deliveries up to 2 GiB.
alter table public.order_deliverables
  drop constraint if exists order_deliverables_file_size_check;

alter table public.order_deliverables
  add constraint order_deliverables_file_size_check
  check (file_size > 0 and file_size <= 2147483648);

update storage.buckets
set file_size_limit = 2147483648,
    allowed_mime_types = null,
    public = false
where id = 'order-deliverables';

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_events'
  ) then
    alter publication supabase_realtime add table public.order_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_deliverables'
  ) then
    alter publication supabase_realtime add table public.order_deliverables;
  end if;
end
$$;
