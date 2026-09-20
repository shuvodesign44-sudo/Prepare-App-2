-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Question bank
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_category text NOT NULL,
  subject text NOT NULL,
  topic text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'medium',
  exam_year integer,
  organization text NOT NULL DEFAULT '',
  question_text text NOT NULL,
  options text[] NOT NULL,
  answer_index integer NOT NULL DEFAULT 0,
  explanation text NOT NULL DEFAULT '',
  ai_explanation text NOT NULL DEFAULT '',
  reference_source text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  language text NOT NULL DEFAULT 'English',
  solve_seconds integer NOT NULL DEFAULT 45,
  status text NOT NULL DEFAULT 'approved',
  source text NOT NULL DEFAULT 'ai',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_lookup_idx ON public.questions (exam_category, subject, difficulty, language, status);
CREATE INDEX questions_topic_idx ON public.questions (topic);
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read approved questions" ON public.questions FOR SELECT TO authenticated
USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write questions" ON public.questions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bookmarks
CREATE TABLE public.question_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_bookmarks TO authenticated;
GRANT ALL ON public.question_bookmarks TO service_role;
ALTER TABLE public.question_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookmarks" ON public.question_bookmarks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Contests
CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  contest_type text NOT NULL DEFAULT 'Daily Live Quiz',
  exam_category text NOT NULL DEFAULT 'BCS Preliminary',
  subject text NOT NULL DEFAULT 'Mixed',
  language text NOT NULL DEFAULT 'English',
  difficulty text NOT NULL DEFAULT 'mixed',
  starts_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 900,
  question_count integer NOT NULL DEFAULT 20,
  negative_marking numeric NOT NULL DEFAULT 0.25,
  time_bonus boolean NOT NULL DEFAULT true,
  randomize_questions boolean NOT NULL DEFAULT true,
  randomize_options boolean NOT NULL DEFAULT true,
  prize text NOT NULL DEFAULT '',
  room_code text UNIQUE,
  is_private boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'scheduled',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contests_starts_at_idx ON public.contests (starts_at DESC);
GRANT SELECT ON public.contests TO authenticated;
GRANT ALL ON public.contests TO service_role;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read contests" ON public.contests FOR SELECT TO authenticated
USING (status <> 'draft' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage contests" ON public.contests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON public.contests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contest participants
CREATE TABLE public.contest_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Candidate',
  score numeric NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  wrong_count integer NOT NULL DEFAULT 0,
  accuracy integer NOT NULL DEFAULT 0,
  time_bonus integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  question_order integer[] NOT NULL DEFAULT '{}'::integer[],
  joined_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  disqualified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, user_id)
);
CREATE INDEX contest_participants_board_idx ON public.contest_participants (contest_id, score DESC, submitted_at);
GRANT SELECT, INSERT, UPDATE ON public.contest_participants TO authenticated;
GRANT ALL ON public.contest_participants TO service_role;
ALTER TABLE public.contest_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read contest board" ON public.contest_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "join contests" ON public.contest_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own entry" ON public.contest_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage participants" ON public.contest_participants FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_contest_participants_updated_at BEFORE UPDATE ON public.contest_participants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  tier text NOT NULL DEFAULT 'bronze',
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "earn achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or broadcast notifications" ON public.notifications FOR SELECT TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "mark own notifications read" ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coins
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0;

-- Realtime for live contests
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contests;