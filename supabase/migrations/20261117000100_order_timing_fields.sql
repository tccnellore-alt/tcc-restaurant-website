-- Track when an order is first accepted and when it is completed.
alter table public.tcc_orders
  add column if not exists accepted_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists tcc_orders_accepted_at_idx
  on public.tcc_orders (accepted_at)
  where accepted_at is not null;

create index if not exists tcc_orders_completed_at_idx
  on public.tcc_orders (completed_at)
  where completed_at is not null;
