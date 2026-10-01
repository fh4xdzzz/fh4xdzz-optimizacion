-- Distribución privada y control de versiones de Dulcan Optimizer.
create table if not exists public.optimizer_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 26214400),
  sha256 text not null check (char_length(sha256) = 64),
  release_notes text check (release_notes is null or char_length(release_notes) <= 2000),
  is_active boolean not null default true,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_optimizer_releases_one_active
  on public.optimizer_releases (is_active)
  where is_active = true;
create index if not exists idx_optimizer_releases_created
  on public.optimizer_releases (created_at desc);

alter table public.optimizer_releases enable row level security;
revoke all on public.optimizer_releases from anon, authenticated;
drop policy if exists "No direct optimizer release access" on public.optimizer_releases;
create policy "No direct optimizer release access"
  on public.optimizer_releases for all to anon, authenticated
  using (false)
  with check (false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'optimizer-releases',
  'optimizer-releases',
  false,
  26214400,
  array['application/vnd.microsoft.portable-executable', 'application/octet-stream']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.optimizer_releases is 'Versiones privadas del instalador de Dulcan Optimizer.';
