-- Rubba production schema extension

create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists paid_tiers (
  id text primary key,
  name text not null,
  generations_per_month int not null default 10,
  price_ngn int not null default 0,
  price_usd numeric(10,2) default 0,
  description text,
  highlight boolean default false,
  stripe_price_id text,
  sort int default 0
);

create table if not exists brand_cards (
  id text primary key,
  category text not null,
  title text not null,
  subtitle text,
  logo_emoji text default '✨',
  logo_url text,
  cta_label text default 'Learn more',
  cta_url text not null,
  sponsor text,
  sort int default 0,
  active boolean default true
);

create table if not exists user_usage (
  user_id text primary key,
  cycle_key text not null,
  used int not null default 0,
  tier_id text default 'free',
  bonus_generations int default 0,
  updated_at timestamptz default now()
);

create table if not exists payment_records (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  tier_id text,
  gateway text,
  reference text unique,
  amount_ngn int,
  amount_usd numeric(10,2),
  currency text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table personas add column if not exists kind text default 'composite';
alter table personas add column if not exists achieved_age int;
alter table personas add column if not exists milestones jsonb default '[]'::jsonb;

alter table app_settings enable row level security;
alter table paid_tiers enable row level security;
alter table brand_cards enable row level security;
alter table user_usage enable row level security;
alter table payment_records enable row level security;

create policy "read app_settings" on app_settings for select using (true);
create policy "read paid_tiers" on paid_tiers for select using (true);
create policy "read brand_cards" on brand_cards for select using (true);

create policy "admin app_settings" on app_settings for all
  using (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'))
  with check (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'));

create policy "admin paid_tiers" on paid_tiers for all
  using (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'))
  with check (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'));

create policy "admin brand_cards" on brand_cards for all
  using (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'))
  with check (exists (select 1 from user_roles r where r.user_id=auth.uid() and r.role='admin'));

create policy "own usage" on user_usage for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
create policy "own payments read" on payment_records for select using (auth.uid()::text = user_id);
