create table if not exists public.tcc_menu_item_overrides (product_key text primary key,name text not null,category text not null default '',section text not null default '',availability text not null default 'available' check (availability in ('available','sold_out')),updated_at timestamptz not null default now());
alter table public.tcc_menu_item_overrides enable row level security;
revoke all on table public.tcc_menu_item_overrides from anon, authenticated;
grant all on table public.tcc_menu_item_overrides to service_role;
