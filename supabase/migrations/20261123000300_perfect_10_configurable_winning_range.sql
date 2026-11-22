create or replace function public.tcc_game_consume_attempt(p_session_hash text, p_elapsed_ms integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
 v_session public.tcc_game_sessions%rowtype;
 v_attempt integer;
 v_winner boolean;
 v_code text;
 v_reward public.tcc_game_rewards%rowtype;
 v_unlimited boolean;
 v_min_ms integer := 9993;
 v_max_ms integer := 10007;
 v_setting text;
begin
 select * into v_session from public.tcc_game_sessions where session_hash=p_session_hash for update;
 if not found then return jsonb_build_object('error','Game session not found.','status',404); end if;
 if v_session.expires_at<=now() then return jsonb_build_object('error','This visit session has expired.','status',410); end if;
 if v_session.is_winner then return jsonb_build_object('error','This session has already won.','status',409); end if;
 if p_elapsed_ms<0 or p_elapsed_ms>60000 then return jsonb_build_object('error','Invalid game timing.','status',400); end if;
 v_unlimited := upper(v_session.table_number) = 'T4';
 if not v_unlimited and v_session.attempts_used>=3 then return jsonb_build_object('error','You have used all 3 attempts for this session.','status',409); end if;
 select setting_value #>> '{}' into v_setting from public.tcc_store_settings where setting_key='perfect_10_min_ms' limit 1;
 if v_setting ~ '^[0-9]+$' then v_min_ms:=v_setting::integer; end if;
 select setting_value #>> '{}' into v_setting from public.tcc_store_settings where setting_key='perfect_10_max_ms' limit 1;
 if v_setting ~ '^[0-9]+$' then v_max_ms:=v_setting::integer; end if;
 if v_min_ms<0 or v_max_ms>60000 or v_min_ms>=v_max_ms then v_min_ms:=9993; v_max_ms:=10007; end if;
 v_attempt:=v_session.attempts_used+1;
 v_winner:=p_elapsed_ms between v_min_ms and v_max_ms;
 update public.tcc_game_sessions set attempts_used=v_attempt,is_winner=v_winner,last_activity_at=now() where id=v_session.id;
 insert into public.tcc_game_attempts(session_id,attempt_number,elapsed_ms,is_winner) values(v_session.id,v_attempt,p_elapsed_ms,v_winner);
 if v_winner then
  loop
   v_code:='TCC10-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
   begin
    insert into public.tcc_game_rewards(reward_code,session_id,table_number,expires_at) values(v_code,v_session.id,v_session.table_number,v_session.expires_at) returning * into v_reward;
    exit;
   exception when unique_violation then v_code:=null;
   end;
  end loop;
  return jsonb_build_object('winner',true,'attempt_number',v_attempt,'attempts_used',v_attempt,'attempts_remaining',case when v_unlimited then -1 else 3-v_attempt end,'unlimited_attempts',v_unlimited,'elapsed_ms',p_elapsed_ms,'winning_min_ms',v_min_ms,'winning_max_ms',v_max_ms,
   'reward',jsonb_build_object('code',v_reward.reward_code,'table_number',v_reward.table_number,'expires_at',v_reward.expires_at,'discount_percent',10,'scope','all_beverages','combine_with_offers',false));
 end if;
 return jsonb_build_object('winner',false,'attempt_number',v_attempt,'attempts_used',v_attempt,'attempts_remaining',case when v_unlimited then -1 else 3-v_attempt end,'unlimited_attempts',v_unlimited,'elapsed_ms',p_elapsed_ms,'winning_min_ms',v_min_ms,'winning_max_ms',v_max_ms);
end; $function$;
revoke all on function public.tcc_game_consume_attempt(text,integer) from public, anon, authenticated;
grant execute on function public.tcc_game_consume_attempt(text,integer) to service_role;
