-- Dedicated TCC table QR credentials. Plaintext QR tokens are never stored.
create table if not exists public.tcc_table_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  table_number text not null unique
    check (table_number = any (array['S1','S2','S3','S4','S5','S6','C1','C2','C3','C4','P1','P2','P3','T1','T2'])),
  token_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.tcc_table_qr_tokens enable row level security;
revoke all on table public.tcc_table_qr_tokens from anon, authenticated;
grant all on table public.tcc_table_qr_tokens to service_role;
