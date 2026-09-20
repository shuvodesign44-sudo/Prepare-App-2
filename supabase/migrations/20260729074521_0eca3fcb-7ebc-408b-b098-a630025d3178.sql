DROP TABLE IF EXISTS public.lesson_sessions;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_exam text,
  ADD COLUMN IF NOT EXISTS exam_date date,
  ADD COLUMN IF NOT EXISTS content_language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS weekly_goal_minutes integer NOT NULL DEFAULT 300;

CREATE TABLE public.mcq_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL DEFAULT 'mixed',
  language text NOT NULL DEFAULT 'English',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 0,
  weak_topics text[] NOT NULL DEFAULT '{}',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcq_attempts TO authenticated;
GRANT ALL ON public.mcq_attempts TO service_role;
ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mcq attempts" ON public.mcq_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.viva_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_score integer,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viva_sessions TO authenticated;
GRANT ALL ON public.viva_sessions TO service_role;
ALTER TABLE public.viva_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own viva sessions" ON public.viva_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'My Resume',
  template text NOT NULL DEFAULT 'ats',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resumes" ON public.resumes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT 'Professional',
  job_description text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cover_letters TO authenticated;
GRANT ALL ON public.cover_letters TO service_role;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cover letters" ON public.cover_letters FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam text NOT NULL,
  summary text NOT NULL DEFAULT '',
  weeks jsonb NOT NULL DEFAULT '[]'::jsonb,
  daily_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study plans" ON public.study_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER update_mcq_attempts_updated_at BEFORE UPDATE ON public.mcq_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_viva_sessions_updated_at BEFORE UPDATE ON public.viva_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cover_letters_updated_at BEFORE UPDATE ON public.cover_letters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();