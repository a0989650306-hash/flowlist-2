-- FlowList 2.0 schema, run in Supabase SQL Editor
create table if not exists public.profiles (
 id text primary key,
 display_name text,
 created_at timestamptz not null default now()
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 user_id text not null references public.profiles(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 180),
 category text not null default '工作' check(category in ('工作','私人')),
 project text not null default '',
 priority text not null default 'normal' check(priority in ('normal','important')),
 notes text not null default '',
 due_at timestamptz,
 completed_at timestamptz,
 reminded_at timestamptz,
 source text not null default 'web',
 created_at timestamptz not null default now()
);
create index if not exists tasks_user_created_idx on public.tasks(user_id, created_at desc);
create index if not exists tasks_reminder_idx on public.tasks(due_at) where priority='important' and completed_at is null and reminded_at is null;
create table if not exists public.pending_clarifications (
 user_id text primary key references public.profiles(id) on delete cascade,
 original_text text not null,
 question text not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.processed_events (id text primary key,created_at timestamptz not null default now());
create table if not exists public.daily_digest_logs (
 user_id text not null references public.profiles(id) on delete cascade,
 date date not null,
 created_at timestamptz not null default now(),
 primary key(user_id,date)
);
-- Only the server-side service role accesses these tables. Never expose the service role key to browsers.
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.pending_clarifications enable row level security;
alter table public.processed_events enable row level security;
alter table public.daily_digest_logs enable row level security;
