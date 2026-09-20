DROP POLICY IF EXISTS "read contest board" ON public.contest_participants;

CREATE POLICY "read own contest entry"
ON public.contest_participants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.contest_board(_contest_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  score numeric,
  correct_count integer,
  accuracy integer,
  time_bonus integer,
  submitted_at timestamptz,
  disqualified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.score, p.correct_count, p.accuracy,
         p.time_bonus, p.submitted_at, p.disqualified
  FROM public.contest_participants p
  JOIN public.contests c ON c.id = p.contest_id
  WHERE p.contest_id = _contest_id
    AND c.status <> 'draft'
    AND auth.uid() IS NOT NULL
  ORDER BY p.score DESC, p.submitted_at ASC NULLS LAST
  LIMIT 100
$$;

CREATE OR REPLACE FUNCTION public.contest_participant_counts(_contest_ids uuid[])
RETURNS TABLE (contest_id uuid, participants bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.contest_id, count(*)
  FROM public.contest_participants p
  WHERE p.contest_id = ANY(_contest_ids)
    AND auth.uid() IS NOT NULL
  GROUP BY p.contest_id
$$;

REVOKE ALL ON FUNCTION public.contest_board(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.contest_participant_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contest_board(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.contest_participant_counts(uuid[]) TO authenticated, service_role;