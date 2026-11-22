create table if not exists public.tcc_table_assistance_requests (
 id uuid primary key default gen_random_uuid(),
 table_number text not null,
 status text not null default 'pending' check (status in ('pending','attended')),
 created_at timestamptz not null default now(),
 attended_at timestamptz,
 attended_by text
);
create index if not exists tcc_table_assistance_requests_status_created_idx
 on public.tcc_table_assistance_requests (status, created_at desc);
create index if not exists tcc_table_assistance_requests_table_status_idx
 on public.tcc_table_assistance_requests (table_number, status, created_at desc);
alter table public.tcc_table_assistance_requests enable row level security;
revoke all on public.tcc_table_assistance_requests from anon, authenticated;
grant all on public.tcc_table_assistance_requests to service_role;
