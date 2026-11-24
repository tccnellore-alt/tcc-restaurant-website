create table if not exists public.tcc_sops (
  id uuid primary key default gen_random_uuid(),
  sop_type text not null check (sop_type in ('product','preparation')),
  name text not null,
  category text not null default '',
  yield text,
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array'),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  image text,
  plating_image text,
  notes text,
  source_status text not null default 'pending_source' check (source_status in ('pending_source','verified','needs_confirmation')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tcc_sops_type_sort_idx on public.tcc_sops (sop_type, sort_order, name);
alter table public.tcc_sops enable row level security;
revoke all on table public.tcc_sops from anon, authenticated;
grant all on table public.tcc_sops to service_role;
