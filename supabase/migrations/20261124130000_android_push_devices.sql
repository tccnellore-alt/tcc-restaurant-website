create table if not exists public.tcc_push_devices (
 id uuid primary key default gen_random_uuid(),
 fcm_token text not null unique,
 device_name text not null default 'Android device',
 platform text not null default 'android' check (platform in ('android')),
 is_active boolean not null default true,
 last_seen_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tcc_push_devices enable row level security;
revoke all on public.tcc_push_devices from public, anon, authenticated;
grant all on public.tcc_push_devices to service_role;
