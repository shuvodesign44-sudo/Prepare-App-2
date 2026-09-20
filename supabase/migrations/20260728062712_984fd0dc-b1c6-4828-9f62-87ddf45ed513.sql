CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  goal TEXT,
  level TEXT,
  daily_minutes INT NOT NULL DEFAULT 10,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  xp INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  lessons_completed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.daily_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lesson_date DATE NOT NULL DEFAULT CURRENT_DATE,
  topic TEXT,
  skill TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_sessions TO authenticated;
GRANT ALL ON public.lesson_sessions TO service_role;
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lessons" ON public.lesson_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();