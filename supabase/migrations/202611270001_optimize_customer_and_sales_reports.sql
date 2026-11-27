create or replace function public.tcc_normalize_phone(p_phone text)
returns text
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $function$
  select case
    when length(digits) = 12 and left(digits, 2) = '91' then right(digits, 10)
    else digits
  end
  from (select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as digits) normalized;
$function$;

create index if not exists tcc_orders_normalized_customer_phone_idx
on public.tcc_orders (public.tcc_normalize_phone(customer_phone))
where archived_at is null;

create or replace function public.tcc_customer_directory_summary()
returns table (
  phone text,
  name text,
  orders bigint,
  spend numeric,
  first_order timestamptz,
  last_order timestamptz,
  days text[],
  visit_days bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with source_orders as (
    select
      public.tcc_normalize_phone(customer_phone) as phone,
      customer_name, total, status, created_at,
      to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as order_day
    from public.tcc_orders
    where archived_at is null
  ),
  grouped_customers as (
    select
      phone,
      coalesce(
        (array_agg(nullif(btrim(customer_name), '') order by created_at desc)
          filter (where nullif(btrim(customer_name), '') is not null and btrim(customer_name) <> 'Guest'))[1],
        'Guest'
      ) as name,
      count(*)::bigint as orders,
      coalesce(sum(total) filter (where status is null or status not in ('cancelled', 'rejected')), 0)::numeric as spend,
      min(created_at) as first_order,
      max(created_at) as last_order,
      array_agg(distinct order_day order by order_day) as days
    from source_orders
    where phone ~ '^[0-9]{10}$'
    group by phone
  )
  select phone, name, orders, spend, first_order, last_order, days, cardinality(days)::bigint as visit_days
  from grouped_customers
  order by spend desc;
$function$;

create or replace function public.tcc_customer_orders_lookup(p_phone text)
returns setof public.tcc_orders
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select o.*
  from public.tcc_orders o
  where o.archived_at is null
    and public.tcc_normalize_phone(o.customer_phone) = public.tcc_normalize_phone(p_phone)
  order by o.created_at desc;
$function$;

create or replace function public.tcc_reports_sales_summary(p_from_date date default null, p_to_date date default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with report_orders as (
    select id, total, status, customer_phone, items
    from public.tcc_orders
    where archived_at is null
      and (p_from_date is null or created_at >= (p_from_date::timestamp at time zone 'Asia/Kolkata'))
      and (p_to_date is null or created_at < ((p_to_date + 1)::timestamp at time zone 'Asia/Kolkata'))
  ),
  valid_orders as (
    select * from report_orders
    where status is null or status not in ('cancelled', 'rejected')
  ),
  product_items as (
    select
      o.id as order_id,
      coalesce(nullif(btrim(item.value->>'name'), ''), 'Unnamed product') as product_name,
      greatest(
        1::numeric,
        case when coalesce(item.value->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?$'
          then (item.value->>'quantity')::numeric else 1::numeric end
      ) as quantity,
      case when coalesce(item.value->>'unit_price', '') ~ '^[0-9]+([.][0-9]+)?$'
        then (item.value->>'unit_price')::numeric else 0::numeric end as unit_price,
      coalesce(addons.addon_total, 0)::numeric as addon_total
    from valid_orders o
    cross join lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) as item(value)
    left join lateral (
      select coalesce(sum(
        case when coalesce(addon.value->>'price', '') ~ '^[0-9]+([.][0-9]+)?$'
          then (addon.value->>'price')::numeric else 0::numeric end
      ), 0)::numeric as addon_total
      from jsonb_array_elements(coalesce(item.value->'addons', '[]'::jsonb)) as addon(value)
    ) addons on true
    where lower(coalesce(item.value->>'item_status', '')) <> 'cancelled'
  ),
  product_totals as (
    select product_name as name, sum(quantity)::numeric as quantity,
      count(distinct order_id)::bigint as orders,
      sum(quantity * (unit_price + addon_total))::numeric as sales
    from product_items
    group by product_name
  )
  select jsonb_build_object(
    'sales', coalesce((select sum(total) from valid_orders), 0),
    'orders', (select count(*) from valid_orders),
    'customers', (
      select count(distinct public.tcc_normalize_phone(customer_phone))
      from valid_orders
      where public.tcc_normalize_phone(customer_phone) ~ '^[0-9]{10}$'
    ),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'orders', orders, 'sales', sales) order by sales desc)
      from product_totals
    ), '[]'::jsonb)
  );
$function$;

revoke all on function public.tcc_customer_directory_summary() from public, anon, authenticated;
grant execute on function public.tcc_customer_directory_summary() to service_role;
revoke all on function public.tcc_customer_orders_lookup(text) from public, anon, authenticated;
grant execute on function public.tcc_customer_orders_lookup(text) to service_role;
revoke all on function public.tcc_reports_sales_summary(date, date) from public, anon, authenticated;
grant execute on function public.tcc_reports_sales_summary(date, date) to service_role;