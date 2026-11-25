-- Apply this migration to the Supabase project used by the TCC feedback form
-- (project ref: ghdgsntpqucopwbtuihe), not the online-ordering project.
alter table public.tcc_feedback
  add column if not exists order_ref text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text;

create index if not exists tcc_feedback_order_ref_idx
  on public.tcc_feedback (order_ref);

create index if not exists tcc_feedback_customer_phone_idx
  on public.tcc_feedback (customer_phone);
