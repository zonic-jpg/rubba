-- Rubba security hardening (audit fixes H1, M1, M3)
-- Safe to run once against the existing production project.

------------------------------------------------------------------------------
-- H1: users must NOT be able to write their own tier / usage counters.
-- Previously: "own usage" was FOR ALL, letting a user set tier_id='premium',
-- used=0, bonus_generations=huge on themselves. Now: read-only for the user;
-- all writes go through the service role (payment-webhook) only.
------------------------------------------------------------------------------
drop policy if exists "own usage" on user_usage;

create policy "own usage read" on user_usage
  for select using (auth.uid()::text = user_id);

-- No INSERT/UPDATE/DELETE policy for anon/authenticated => client writes denied.
-- The service role bypasses RLS and remains the only writer.

------------------------------------------------------------------------------
-- M1: admin write authorization was pinned to user_roles, which nothing ever
-- populates, so writes silently failed. Replace with a single is_admin() based
-- on the real super-admin email + granted staff, matching the app's model.
------------------------------------------------------------------------------
create or replace function is_rubba_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists (
      select 1 from admin_registry r
      where r.id = 1
        and lower(r.super_admin_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    or exists (
      select 1 from admin_staff s
      where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and array_length(s.permissions, 1) > 0
    );
$$;

-- Repoint every admin-writable table's policies at is_rubba_admin().
do $$
declare t text;
begin
  foreach t in array array['content','personas','pathways','app_settings','paid_tiers','brand_cards']
  loop
    execute format('drop policy if exists "admin writes %1$s" on %1$s', t);
    execute format('drop policy if exists "admin %1$s" on %1$s', t);
    execute format($f$create policy "admin write %1$s" on %1$s for all
      using (is_rubba_admin()) with check (is_rubba_admin())$f$, t);
  end loop;
end $$;

------------------------------------------------------------------------------
-- M3: the full staff roster (emails + permissions) was readable by ANY logged-in
-- user. Restrict it to admins. Keep the single super-admin email readable so the
-- login UI can show ownership, but nothing more.
------------------------------------------------------------------------------
drop policy if exists "read admin_staff" on admin_staff;
create policy "admin reads staff" on admin_staff
  for select to authenticated using (is_rubba_admin());

-- admin_registry already restricts writes to the super admin; leave its read as
-- authenticated (it exposes only the owner email, needed by the UI).

------------------------------------------------------------------------------
-- Bootstrap: ensure the canonical super admin row exists.
------------------------------------------------------------------------------
insert into admin_registry (id, super_admin_email)
values (1, 'oadeagbo@gmail.com')
on conflict (id) do nothing;
