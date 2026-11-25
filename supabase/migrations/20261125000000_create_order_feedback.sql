create table if not exists public.tcc_order_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.tcc_orders(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
alter table public.tcc_order_feedback enable row level security;
revoke all on public.tcc_order_feedback from anon, authenticated;
create or replace function public.submit_tcc_order_rating(p_order_number text, p_rating integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_order_id uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  select id into v_order_id from public.tcc_orders where order_number = trim(p_order_number) and status not in ('cancelled','rejected') limit 1;
  if v_order_id is null then raise exception 'Order not found'; end if;
  insert into public.tcc_order_feedback(order_id,rating) values(v_order_id,p_rating)
  on conflict(order_id) do update set rating=excluded.rating,created_at=now();
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.submit_tcc_order_rating(text, integer) from public;
grant execute on function public.submit_tcc_order_rating(text, integer) to anon, authenticated;