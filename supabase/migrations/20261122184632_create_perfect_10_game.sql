create table if not exists public.tcc_game_sessions (
  id uuid primary key default gen_random_uuid(),
  session_hash text not null unique,
  table_number text not null,
  qr_token_hash text not null,
  attempts_used smallint not null default 0 check (attempts_used between 0 and 3),
  is_winner boolean not null default false,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists tcc_game_sessions_table_started_idx on public.tcc_game_sessions(table_number, started_at desc);

create table if not exists public.tcc_game_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tcc_game_sessions(id) on delete cascade,
  attempt_number smallint not null check (attempt_number between 1 and 3),
  elapsed_ms integer not null check (elapsed_ms between 0 and 60000),
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  unique(session_id, attempt_number)
);

create table if not exists public.tcc_game_rewards (
  id uuid primary key default gen_random_uuid(),
  reward_code text not null unique,
  session_id uuid not null unique references public.tcc_game_sessions(id) on delete restrict,
  table_number text not null,
  discount_percent smallint not null default 10 check (discount_percent = 10),
  discount_scope text not null default 'all_beverages' check (discount_scope = 'all_beverages'),
  combine_with_offers boolean not null default false check (combine_with_offers = false),
  status text not null default 'pending' check (status in ('pending','redeemed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by text
);
create index if not exists tcc_game_rewards_status_created_idx on public.tcc_game_rewards(status, created_at desc);
create index if not exists tcc_game_rewards_expires_idx on public.tcc_game_rewards(expires_at);

alter table public.tcc_game_sessions enable row level security;
alter table public.tcc_game_attempts enable row level security;
alter table public.tcc_game_rewards enable row level security;
revoke all on public.tcc_game_sessions, public.tcc_game_attempts, public.tcc_game_rewards from anon, authenticated;
grant all on public.tcc_game_sessions, public.tcc_game_attempts, public.tcc_game_rewards to service_role;

create or replace function public.tcc_game_consume_attempt(p_session_hash text, p_elapsed_ms integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_session public.tcc_game_sessions%rowtype; v_attempt integer; v_winner boolean; v_code text; v_reward public.tcc_game_rewards%rowtype;
begin
 select * into v_session from public.tcc_game_sessions where session_hash=p_session_hash for update;
 if not found then return jsonb_build_object('error','Game session not found.','status',404); end if;
 if v_session.expires_at<=now() then return jsonb_build_object('error','This visit session has expired.','status',410); end if;
 if v_session.is_winner then return jsonb_build_object('error','This session has already won.','status',409); end if;
 if p_elapsed_ms<0 or p_elapsed_ms>60000 then return jsonb_build_object('error','Invalid game timing.','status',400); end if;
 if v_session.attempts_used>=3 then return jsonb_build_object('error','You have used all 3 attempts for this session.','status',409); end if;
 v_attempt:=v_session.attempts_used+1; v_winner:=p_elapsed_ms between 9991 and 10009;
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
  return jsonb_build_object('winner',true,'attempt_number',v_attempt,'attempts_used',v_attempt,'attempts_remaining',3-v_attempt,'elapsed_ms',p_elapsed_ms,
   'reward',jsonb_build_object('code',v_reward.reward_code,'table_number',v_reward.table_number,'expires_at',v_reward.expires_at,'discount_percent',10,'scope','all_beverages','combine_with_offers',false));
 end if;
 return jsonb_build_object('winner',false,'attempt_number',v_attempt,'attempts_used',v_attempt,'attempts_remaining',3-v_attempt,'elapsed_ms',p_elapsed_ms);
end; $$;

create or replace function public.tcc_game_redeem_reward(p_reward_code text,p_redeemed_by text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_reward public.tcc_game_rewards%rowtype;
begin
 select * into v_reward from public.tcc_game_rewards where reward_code=upper(trim(p_reward_code)) for update;
 if not found then return jsonb_build_object('error','Reward code not found.','status',404); end if;
 if v_reward.status='redeemed' then return jsonb_build_object('error','This reward has already been redeemed.','status',409); end if;
 if v_reward.expires_at<=now() then return jsonb_build_object('error','This reward has expired for this visit.','status',410); end if;
 update public.tcc_game_rewards set status='redeemed',redeemed_at=now(),redeemed_by=left(coalesce(nullif(trim(p_redeemed_by),''),'TCC Desk'),80)
 where id=v_reward.id returning * into v_reward;
 return jsonb_build_object('success',true,'reward',jsonb_build_object('reward_code',v_reward.reward_code,'table_number',v_reward.table_number,
  'discount_percent',v_reward.discount_percent,'discount_scope',v_reward.discount_scope,'combine_with_offers',v_reward.combine_with_offers,
  'redeemed_at',v_reward.redeemed_at,'redeemed_by',v_reward.redeemed_by));
end; $$;

revoke all on function public.tcc_game_consume_attempt(text,integer) from public,anon,authenticated;
revoke all on function public.tcc_game_redeem_reward(text,text) from public,anon,authenticated;
grant execute on function public.tcc_game_consume_attempt(text,integer) to service_role;
grant execute on function public.tcc_game_redeem_reward(text,text) to service_role;
