-- TCC Manager device registrations. Access is service-role-only; no client policies are created.
create table if not exists public.tcc_manager_devices (
  id uuid primary key default gen_random_uuid(),
  fcm_token text not null unique,
  manager_username text not null default 'manager',
  device_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table public.tcc_manager_devices enable row level security;
revoke all on public.tcc_manager_devices from anon, authenticated;
grant all on public.tcc_manager_devices to service_role;
create index if not exists tcc_manager_devices_active_idx on public.tcc_manager_devices (is_active) where is_active = true;
