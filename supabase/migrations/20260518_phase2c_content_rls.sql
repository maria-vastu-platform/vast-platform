-- Phase 2 step C (RLS half): replace the wide-open SELECT access on
-- weeks / days / materials with entitlement-gated versions.
--
-- Vastu's actual permissive policy is "Enable full access for all users"
-- (cmd ALL, qual = true) — verified via live pre-flight audit. We drop
-- that real policy (the astrology-era name "Authenticated users can
-- view X" is also dropped, harmless if absent). Teacher full CRUD is
-- preserved by the existing "Teachers can manage X" (ALL, role=teacher)
-- policies, so dropping the open ALL policy does not affect teachers.
-- Students never write these tables; they only need the new gated
-- SELECT. After step A's backfill every current student is entitled to
-- "Kohorte 1", so existing users see no change.

drop policy if exists "Authenticated users can view weeks" on public.weeks;
drop policy if exists "Enable full access for all users" on public.weeks;
drop policy if exists "Users can view weeks for entitled courses" on public.weeks;
create policy "Users can view weeks for entitled courses"
  on public.weeks for select
  using (
    exists (
      select 1 from public.user_entitlements e
      where e.user_id = auth.uid() and e.course_id = weeks.course_id
    )
    or public.get_user_role() = 'teacher'
  );

drop policy if exists "Authenticated users can view days" on public.days;
drop policy if exists "Enable full access for all users" on public.days;
drop policy if exists "Users can view days for entitled courses" on public.days;
create policy "Users can view days for entitled courses"
  on public.days for select
  using (
    exists (
      select 1 from public.weeks w
      where w.id = days.week_id and (
        exists (
          select 1 from public.user_entitlements e
          where e.user_id = auth.uid() and e.course_id = w.course_id
        )
        or public.get_user_role() = 'teacher'
      )
    )
  );

drop policy if exists "Authenticated users can view materials" on public.materials;
drop policy if exists "Enable full access for all users" on public.materials;
drop policy if exists "Users can view materials for entitled courses" on public.materials;
create policy "Users can view materials for entitled courses"
  on public.materials for select
  using (
    exists (
      select 1 from public.weeks w
      where (
        w.id = materials.week_id
        or w.id = (select d.week_id from public.days d where d.id = materials.day_id)
      )
      and (
        exists (
          select 1 from public.user_entitlements e
          where e.user_id = auth.uid() and e.course_id = w.course_id
        )
        or public.get_user_role() = 'teacher'
      )
    )
  );
