-- Rubba schema (run in the shared ZonicMe Supabase project)

create table if not exists content (
  key text primary key, value jsonb not null default '{}'::jsonb, updated_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text, role text default 'user', created_at timestamptz default now()
);
create table if not exists user_roles (
  user_id uuid references auth.users(id) on delete cascade, role text not null,
  primary key (user_id, role)
);

create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into profiles(id,email) values (new.id,new.email) on conflict do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- a saved plan (as-is profile + goals + generated roadmap)
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile jsonb not null, goals text[] not null default '{}',
  inspiration text, dreams text[] default '{}', custom_text text,
  roadmap jsonb, score int, created_at timestamptz default now()
);

-- admin-editable content
create table if not exists personas (
  id text primary key, name text, city text, age int, av text,
  goals text[] default '{}', story text, tags text[] default '{}', sort int default 0
);
create table if not exists pathways (
  id uuid primary key default gen_random_uuid(),
  title text, description text, yield_label text, colour text, sort int default 0
);

alter table content    enable row level security;
alter table profiles   enable row level security;
alter table user_roles enable row level security;
alter table plans      enable row level security;
alter table personas   enable row level security;
alter table pathways   enable row level security;

create policy "read content"  on content  for select using (true);
create policy "read personas" on personas for select using (true);
create policy "read pathways" on pathways for select using (true);
create policy "own profile"   on profiles for select using (auth.uid() = id);
create policy "own plans"     on plans    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "admin writes content"  on content  for all
  using (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'))
  with check (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'));
create policy "admin writes personas" on personas for all
  using (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'))
  with check (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'));
create policy "admin writes pathways" on pathways for all
  using (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'))
  with check (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'));
