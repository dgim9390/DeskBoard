-- 데스크테리어: 사용자별 저장 셋업
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 한 번만 실행

create table if not exists public.setups (
  id         text primary key,                                   -- 앱에서 만든 id (같은 셋업을 다시 올려도 중복되지 않음)
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  desk       jsonb not null,                                     -- { width, depth } (cm)
  items      jsonb not null,                                     -- 배치된 장비 목록
  saved_at   timestamptz not null default now()
);

create index if not exists setups_user_saved_idx on public.setups (user_id, saved_at desc);

-- 행 단위 보안: 로그인한 본인 셋업만 읽기/쓰기 가능
alter table public.setups enable row level security;

drop policy if exists "setups_select_own" on public.setups;
drop policy if exists "setups_insert_own" on public.setups;
drop policy if exists "setups_update_own" on public.setups;
drop policy if exists "setups_delete_own" on public.setups;

create policy "setups_select_own" on public.setups for select to authenticated using (auth.uid() = user_id);
create policy "setups_insert_own" on public.setups for insert to authenticated with check (auth.uid() = user_id);
create policy "setups_update_own" on public.setups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "setups_delete_own" on public.setups for delete to authenticated using (auth.uid() = user_id);
