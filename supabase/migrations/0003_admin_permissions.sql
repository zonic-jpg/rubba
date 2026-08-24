-- Rubba admin permissions: super admin + granular staff rights

create table if not exists admin_registry (
  id int primary key default 1 check (id = 1),
  super_admin_email text not null default 'oadeagbo@gmail.com',
  updated_at timestamptz default now()
);

insert into admin_registry (id, super_admin_email)
values (1, 'oadeagbo@gmail.com')
on conflict (id) do update set super_admin_email = excluded.super_admin_email
where admin_registry.super_admin_email is null or admin_registry.super_admin_email = '';

create table if not exists admin_staff (
  email text primary key,
  permissions text[] not null default '{}',
  granted_at timestamptz default now(),
  granted_by text not null
);

alter table admin_registry enable row level security;
alter table admin_staff enable row level security;

-- Super admin email readable by authenticated users (for UI); staff list readable by super admin only in app layer
create policy "read admin_registry" on admin_registry for select to authenticated using (true);
create policy "read admin_staff" on admin_staff for select to authenticated using (true);

-- Writes via service role / edge functions in production; permissive for super admin via legacy user_roles until edge function added
create policy "super writes registry" on admin_registry for all
  using (
    exists (
      select 1 from admin_registry r
      where r.id = 1 and lower(r.super_admin_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1 from admin_registry r
      where r.id = 1 and lower(r.super_admin_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "super manages staff" on admin_staff for all
  using (
    exists (
      select 1 from admin_registry r
      where r.id = 1 and lower(r.super_admin_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1 from admin_registry r
      where r.id = 1 and lower(r.super_admin_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Bootstrap: grant oadeagbo@gmail.com super admin via user_roles when they sign up
-- (super admin is determined by admin_registry.super_admin_email match on login)
