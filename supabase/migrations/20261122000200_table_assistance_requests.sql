-- Table assistance requests from dedicated table QR credentials only.
create table if not exists public.tcc_table_assistance_requests (
  id uuid primary key default gen_random_uuid(),
  table_number text not null check (table_number = any (array['S1','S2','S3','S4','S5','S6','C1','C2','C3','C4','P1','P2','P3','T1','T2'])),
  status text not null default 'pending' check (status in ('pending','attended')),
  created_at timestamptz not null default now(),
  attended_at timestamptz
);
create index if not exists tcc_table_assistance_pending_idx on public.tcc_table_assistance_requests(status, created_at desc);
alter table public.tcc_table_assistance_requests enable row level security;
revoke all on public.tcc_table_assistance_requests from anon, authenticated;
grant all on public.tcc_table_assistance_requests to service_role;
