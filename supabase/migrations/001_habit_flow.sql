create extension if not exists pgcrypto;

do $$ begin
  create type public.habit_status as enum ('active', 'completed', 'archived');
exception when duplicate_object then null;
end $$;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  category text not null check (char_length(category) between 1 and 40),
  color text not null check (color in ('sage', 'gold', 'sky', 'coral', 'lilac')),
  frequency smallint not null check (frequency between 1 and 7),
  scheduled_days smallint[] not null check (cardinality(scheduled_days) between 1 and 7),
  reminder_time time,
  status public.habit_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (frequency = cardinality(scheduled_days)),
  check (array_position(scheduled_days, 7) is null)
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  due_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_status_created_idx on public.habits(user_id, status, created_at desc);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, completed_on desc);
create index if not exists habit_logs_habit_date_idx on public.habit_logs(habit_id, completed_on desc);
create index if not exists tasks_user_done_due_idx on public.tasks(user_id, completed, due_date, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "users own their habits" on public.habits;
create policy "users own their habits" on public.habits for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users read own logs" on public.habit_logs;
create policy "users read own logs" on public.habit_logs for select to authenticated using (user_id = auth.uid());
drop policy if exists "users create own logs for own habits" on public.habit_logs;
create policy "users create own logs for own habits" on public.habit_logs for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
drop policy if exists "users delete own logs" on public.habit_logs;
create policy "users delete own logs" on public.habit_logs for delete to authenticated using (user_id = auth.uid() and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid()));
drop policy if exists "users own their tasks" on public.tasks;
create policy "users own their tasks" on public.tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
