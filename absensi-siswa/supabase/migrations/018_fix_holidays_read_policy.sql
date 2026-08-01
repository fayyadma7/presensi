-- Data hari libur harus tetap dapat dibaca oleh pengguna setelah login ulang.
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'holidays'
      AND policyname = 'Authenticated read holidays'
  ) THEN
    CREATE POLICY "Authenticated read holidays"
      ON public.holidays
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
