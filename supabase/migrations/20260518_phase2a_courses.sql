-- Phase 2 step A — courses + user_entitlements (multi-cohort foundation).
--
-- Each course = one Kohorte (intake/run). A student gets access via a
-- row in user_entitlements; teachers grant/revoke manually (the invite
-- link flow lands in step D). weeks.course_id is added now but not yet
-- used by the SELECT policies — that wiring lands in step C so existing
-- behaviour stays intact while we build up to the cohort gate.
--
-- ZERO-DISRUPTION BACKFILL: a single default course "Kohorte 1" is
-- created, every existing week is assigned to it, and every existing
-- student is entitled to it (source='migration'). Maria's current
-- students keep seeing exactly what they see today. Only NEW cohorts
-- created from here on get content isolation.
--
-- Idempotent. Safe to re-run.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null default 'manual' check (source in ('invite', 'manual', 'migration')),
  source_payment_id text,
  granted_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.weeks add column if not exists course_id uuid references public.courses(id);
create index if not exists weeks_course_id_idx on public.weeks(course_id);

alter table public.courses enable row level security;
alter table public.user_entitlements enable row level security;

drop policy if exists "Authenticated can read courses" on public.courses;
create policy "Authenticated can read courses"
  on public.courses for select to authenticated using (true);

drop policy if exists "Teachers can manage courses" on public.courses;
create policy "Teachers can manage courses"
  on public.courses for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

drop policy if exists "Users see own entitlements" on public.user_entitlements;
create policy "Users see own entitlements"
  on public.user_entitlements for select using (auth.uid() = user_id);

drop policy if exists "Teachers see all entitlements" on public.user_entitlements;
create policy "Teachers see all entitlements"
  on public.user_entitlements for select using (public.get_user_role() = 'teacher');

drop policy if exists "Teachers manage entitlements" on public.user_entitlements;
create policy "Teachers manage entitlements"
  on public.user_entitlements for all using (public.get_user_role() = 'teacher')
  with check (public.get_user_role() = 'teacher');

-- Default cohort so nothing existing loses access.
insert into public.courses (slug, title, description, order_index)
values ('kohorte-1', 'Kohorte 1', 'Erste Kohorte der Ausbildung.', 1)
on conflict (slug) do nothing;

update public.weeks
  set course_id = (select id from public.courses where slug = 'kohorte-1')
  where course_id is null;

insert into public.user_entitlements (user_id, course_id, source)
select p.id, (select id from public.courses where slug = 'kohorte-1'), 'migration'
from public.profiles p
where p.role = 'student'
on conflict (user_id, course_id) do nothing;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
