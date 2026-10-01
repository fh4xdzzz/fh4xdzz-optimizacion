-- Vinculación privada entre pedidos pagados y Dulcan Optimizer.
create table if not exists public.optimizer_access_codes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  code_hash text not null unique check (char_length(code_hash) = 64),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_optimizer_access_codes_order_active
  on public.optimizer_access_codes (order_id, expires_at desc)
  where used_at is null;
create index if not exists idx_optimizer_access_codes_user
  on public.optimizer_access_codes (user_id, created_at desc);

alter table public.optimizer_access_codes enable row level security;
revoke all on public.optimizer_access_codes from anon, authenticated;
drop policy if exists "No direct optimizer code access" on public.optimizer_access_codes;
create policy "No direct optimizer code access"
  on public.optimizer_access_codes for all to anon, authenticated
  using (false)
  with check (false);

create table if not exists public.optimizer_reports (
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid not null unique references public.optimizer_access_codes(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  app_version text not null check (char_length(app_version) between 1 and 32),
  device_name text check (device_name is null or char_length(device_name) <= 80),
  report jsonb not null check (jsonb_typeof(report) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_optimizer_reports_order_created
  on public.optimizer_reports (order_id, created_at desc);
create index if not exists idx_optimizer_reports_user_created
  on public.optimizer_reports (user_id, created_at desc);

alter table public.optimizer_reports enable row level security;

drop policy if exists "Authorized users can view optimizer reports" on public.optimizer_reports;
create policy "Authorized users can view optimizer reports"
  on public.optimizer_reports for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.users
      where users.id = (select auth.uid())
        and users.role in ('staff', 'admin', 'owner')
    )
  );

grant select on public.optimizer_reports to authenticated;
revoke insert, update, delete on public.optimizer_reports from anon, authenticated;

create or replace function public.consume_optimizer_code(
  p_code_hash text,
  p_app_version text,
  p_device_name text,
  p_report jsonb
)
returns table (report_id uuid, order_id uuid, user_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code public.optimizer_access_codes%rowtype;
  v_report_id uuid;
begin
  if jsonb_typeof(p_report) is distinct from 'object' then
    raise exception 'invalid_report';
  end if;

  update public.optimizer_access_codes
  set used_at = now()
  where code_hash = p_code_hash
    and used_at is null
    and expires_at > now()
  returning * into v_code;

  if v_code.id is null then
    raise exception 'invalid_or_expired_code';
  end if;

  insert into public.optimizer_reports (
    access_code_id, order_id, user_id, app_version, device_name, report
  ) values (
    v_code.id,
    v_code.order_id,
    v_code.user_id,
    left(p_app_version, 32),
    nullif(left(trim(coalesce(p_device_name, '')), 80), ''),
    p_report
  ) returning id into v_report_id;

  insert into public.order_events (order_id, event_type, description)
  values (v_code.order_id, 'note_added', 'Diagnóstico recibido desde Dulcan Optimizer');

  return query select v_report_id, v_code.order_id, v_code.user_id;
end;
$$;

revoke all on function public.consume_optimizer_code(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.consume_optimizer_code(text, text, text, jsonb) to service_role;

comment on table public.optimizer_access_codes is 'Códigos SHA-256 temporales y de un solo uso para vincular Dulcan Optimizer.';
comment on table public.optimizer_reports is 'Diagnósticos privados enviados por Dulcan Optimizer y vinculados a pedidos pagados.';
