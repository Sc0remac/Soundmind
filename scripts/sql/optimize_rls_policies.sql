-- Optimize RLS policies: avoid per-row initplans by wrapping auth.* calls in SELECT,
-- and consolidate duplicate permissive policies where safe.
-- Run this in Supabase SQL Editor or psql against your project.

BEGIN;

-- moods: keep existing policies, wrap auth.uid()
ALTER POLICY "Users can insert their own moods" ON public.moods
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can update their own moods" ON public.moods
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can view their own moods" ON public.moods
  USING ((user_id = (select auth.uid())));

-- workouts: drop duplicate human-named policies; keep snake_case and wrap
DROP POLICY IF EXISTS "Users can insert their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;

ALTER POLICY workouts_insert_own ON public.workouts
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY workouts_update_own ON public.workouts
  USING ((user_id = (select auth.uid())));

ALTER POLICY workouts_select_own ON public.workouts
  USING ((user_id = (select auth.uid())));

ALTER POLICY workouts_delete_own ON public.workouts
  USING ((user_id = (select auth.uid())));

-- body_parts
ALTER POLICY "bp delete own" ON public.body_parts
  USING ((user_id = (select auth.uid())));

ALTER POLICY "bp insert own" ON public.body_parts
  WITH CHECK (((user_id = (select auth.uid())) AND (is_global = false)));

ALTER POLICY "bp select" ON public.body_parts
  USING (((is_global = true) OR (user_id = (select auth.uid()))));

ALTER POLICY "bp update own" ON public.body_parts
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- exercise_body_parts
ALTER POLICY "ebp delete own" ON public.exercise_body_parts
  USING ((user_id = (select auth.uid())));

ALTER POLICY "ebp insert own" ON public.exercise_body_parts
  WITH CHECK (((user_id = (select auth.uid())) AND (is_global = false)));

ALTER POLICY "ebp select" ON public.exercise_body_parts
  USING (((is_global = true) OR (user_id = (select auth.uid()))));

ALTER POLICY "ebp update own" ON public.exercise_body_parts
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- exercises
ALTER POLICY "exercises delete own" ON public.exercises
  USING ((user_id = (select auth.uid())));

ALTER POLICY "exercises insert own" ON public.exercises
  WITH CHECK (((user_id = (select auth.uid())) AND (is_global = false)));

ALTER POLICY "exercises select" ON public.exercises
  USING (((is_global = true) OR (user_id = (select auth.uid()))));

ALTER POLICY "exercises update own" ON public.exercises
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- training_focus
ALTER POLICY "focus delete own" ON public.training_focus
  USING ((user_id = (select auth.uid())));

ALTER POLICY "focus insert own" ON public.training_focus
  WITH CHECK (((user_id = (select auth.uid())) AND (is_global = false)));

ALTER POLICY "focus select" ON public.training_focus
  USING (((is_global = true) OR (user_id = (select auth.uid()))));

ALTER POLICY "focus update own" ON public.training_focus
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- training_splits
ALTER POLICY "splits delete own" ON public.training_splits
  USING ((user_id = (select auth.uid())));

ALTER POLICY "splits insert own" ON public.training_splits
  WITH CHECK (((user_id = (select auth.uid())) AND (is_global = false)));

ALTER POLICY "splits select" ON public.training_splits
  USING (((is_global = true) OR (user_id = (select auth.uid()))));

ALTER POLICY "splits update own" ON public.training_splits
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- training_splits_body_parts
ALTER POLICY "tsbp delete own" ON public.training_splits_body_parts
  USING ((user_id = (select auth.uid())));

ALTER POLICY "tsbp insert own" ON public.training_splits_body_parts
  WITH CHECK (((user_id = (select auth.uid())) AND (is_global = false)));

ALTER POLICY "tsbp select" ON public.training_splits_body_parts
  USING (((is_global = true) OR (user_id = (select auth.uid()))));

ALTER POLICY "tsbp update own" ON public.training_splits_body_parts
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- spotify_listens: drop duplicate human-named policies; keep snake_case and wrap
DROP POLICY IF EXISTS "listens delete own" ON public.spotify_listens;
DROP POLICY IF EXISTS "listens insert own via services" ON public.spotify_listens;
DROP POLICY IF EXISTS "listens select own" ON public.spotify_listens;

ALTER POLICY listens_delete_own ON public.spotify_listens
  USING ((user_id = (select auth.uid())));

ALTER POLICY listens_insert_own ON public.spotify_listens
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY listens_select_own ON public.spotify_listens
  USING ((user_id = (select auth.uid())));

ALTER POLICY listens_update_own ON public.spotify_listens
  USING ((user_id = (select auth.uid())));

-- workout_exercises
ALTER POLICY we_delete_own ON public.workout_exercises
  USING ((EXISTS ( SELECT 1 FROM public.workouts w
                   WHERE w.id = workout_exercises.workout_id
                     AND w.user_id = (select auth.uid()))));

ALTER POLICY we_insert_own ON public.workout_exercises
  WITH CHECK ((EXISTS ( SELECT 1 FROM public.workouts w
                        WHERE w.id = workout_exercises.workout_id
                          AND w.user_id = (select auth.uid()))));

ALTER POLICY we_select_own ON public.workout_exercises
  USING ((EXISTS ( SELECT 1 FROM public.workouts w
                   WHERE w.id = workout_exercises.workout_id
                     AND w.user_id = (select auth.uid()))));

ALTER POLICY we_update_own ON public.workout_exercises
  USING ((EXISTS ( SELECT 1 FROM public.workouts w
                   WHERE w.id = workout_exercises.workout_id
                     AND w.user_id = (select auth.uid()))));

-- workout_sets
ALTER POLICY ws_delete_own ON public.workout_sets
  USING ((EXISTS ( SELECT 1 FROM public.workout_exercises we
                   JOIN public.workouts w ON w.id = we.workout_id
                  WHERE we.id = workout_sets.exercise_id
                    AND w.user_id = (select auth.uid()))));

ALTER POLICY ws_insert_own ON public.workout_sets
  WITH CHECK ((EXISTS ( SELECT 1 FROM public.workout_exercises we
                        JOIN public.workouts w ON w.id = we.workout_id
                       WHERE we.id = workout_sets.exercise_id
                         AND w.user_id = (select auth.uid()))));

ALTER POLICY ws_select_own ON public.workout_sets
  USING ((EXISTS ( SELECT 1 FROM public.workout_exercises we
                   JOIN public.workouts w ON w.id = we.workout_id
                  WHERE we.id = workout_sets.exercise_id
                    AND w.user_id = (select auth.uid()))));

ALTER POLICY ws_update_own ON public.workout_sets
  USING ((EXISTS ( SELECT 1 FROM public.workout_exercises we
                   JOIN public.workouts w ON w.id = we.workout_id
                  WHERE we.id = workout_sets.exercise_id
                    AND w.user_id = (select auth.uid()))));

-- profiles: drop duplicate human-named policies and duplicate upsert, keep snake_case and wrap
DROP POLICY IF EXISTS "profiles read own" ON public.profiles;
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles upsert own" ON public.profiles;
DROP POLICY IF EXISTS profiles_upsert_own ON public.profiles;

ALTER POLICY profiles_insert_own ON public.profiles
  WITH CHECK ((id = (select auth.uid())));

ALTER POLICY profiles_select_own ON public.profiles
  USING ((id = (select auth.uid())));

ALTER POLICY profiles_update_own ON public.profiles
  USING ((id = (select auth.uid())));

-- spotify_accounts: drop redundant owner/self/upsert duplicates; keep *_own and wrap
DROP POLICY IF EXISTS spotify_accounts_owner_insert ON public.spotify_accounts;
DROP POLICY IF EXISTS spotify_accounts_owner_select ON public.spotify_accounts;
DROP POLICY IF EXISTS spotify_accounts_owner_update ON public.spotify_accounts;
DROP POLICY IF EXISTS spotify_accounts_select_self ON public.spotify_accounts;
DROP POLICY IF EXISTS spotify_accounts_upsert_own ON public.spotify_accounts;

ALTER POLICY spotify_accounts_insert_own ON public.spotify_accounts
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY spotify_accounts_select_own ON public.spotify_accounts
  USING ((user_id = (select auth.uid())));

ALTER POLICY spotify_accounts_update_own ON public.spotify_accounts
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

COMMIT;

-- Note on spotify_tracks:
-- You currently have multiple permissive SELECT policies (tracks_read, tracks_read_all, tracks_select_all).
-- Decide whether SELECT should be public or restricted to authenticated users, then keep exactly one policy.
-- Example options:
--   -- Public read (single policy)
--   -- DROP POLICY IF EXISTS tracks_read_all ON public.spotify_tracks;
--   -- DROP POLICY IF EXISTS tracks_select_all ON public.spotify_tracks;
--   -- (keep: CREATE POLICY "tracks read" ON public.spotify_tracks FOR SELECT USING (true);
--
--   -- Authenticated-only read (single policy)
--   -- DROP POLICY IF EXISTS "tracks read" ON public.spotify_tracks;
--   -- DROP POLICY IF EXISTS tracks_select_all ON public.spotify_tracks;
--   -- ALTER POLICY tracks_read_all ON public.spotify_tracks TO authenticated USING (true);

