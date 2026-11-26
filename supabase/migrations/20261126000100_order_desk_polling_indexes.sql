-- Support the Order Desk's incremental sync and active-order initial load.
-- These indexes keep the polling queries from scanning/sorting the full order table
-- as order volume grows.

create index if not exists tcc_orders_updated_at_sync_idx
  on public.tcc_orders (updated_at);

create index if not exists tcc_orders_active_created_at_idx
  on public.tcc_orders (created_at desc)
  where archived_at is null;
