create or replace function public.tcc_game_statistics(p_start timestamptz default null,p_end timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
 with sessions as (
   select id,is_winner,attempts_used
   from public.tcc_game_sessions
   where (p_start is null or started_at >= p_start)
     and started_at < coalesce(p_end,now())
 ),
 attempt_totals as (
   select count(*)::bigint as total
   from public.tcc_game_attempts a
   join sessions s on s.id=a.session_id
 ),
 reward_totals as (
   select count(*)::bigint as generated,
          count(*) filter (where status='redeemed')::bigint as redeemed
   from public.tcc_game_rewards r
   join sessions s on s.id=r.session_id
 ),
 summary as (
   select count(*)::bigint as players,
          count(*) filter (where is_winner)::bigint as wins,
          count(*) filter (where not is_winner)::bigint as non_winners,
          coalesce(avg(attempts_used),0)::numeric as average_attempts
   from sessions
 )
 select jsonb_build_object(
   'players',summary.players,
   'wins',summary.wins,
   'non_winners',summary.non_winners,
   'attempts',attempt_totals.total,
   'win_rate',case when summary.players=0 then 0 else round(summary.wins::numeric*100/summary.players,1) end,
   'average_attempts',round(summary.average_attempts,2),
   'rewards_generated',reward_totals.generated,
   'rewards_redeemed',reward_totals.redeemed
 )
 from summary,attempt_totals,reward_totals;
$$;
revoke all on function public.tcc_game_statistics(timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.tcc_game_statistics(timestamptz,timestamptz) to service_role;
