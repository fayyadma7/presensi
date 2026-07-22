-- Migration 006: Single-row attendance per student per day
-- Converts attendance to single-row-per-student-per-day with masuk/pulang columns
-- Converts subject_attendances to single-row-per-student-per-day with JSONB log
BEGIN;

DO $migration$
DECLARE
  _needs_migration boolean;
BEGIN
  -- Check if old attendance schema still exists (has 'type' column)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'type'
  ) INTO _needs_migration;

  IF NOT _needs_migration THEN
    RAISE NOTICE 'Migration 006 already applied, skipping.';
    RETURN;
  END IF;

  -- Drop temporary tables from any aborted runs
  DROP TABLE IF EXISTS attendance_new CASCADE;
  DROP TABLE IF EXISTS subject_attendances_new CASCADE;

  -- ================================================================
  -- 1. ATTENDANCE TABLE
  -- ================================================================

  EXECUTE $ddl$CREATE TABLE attendance_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    masuk_status VARCHAR(20) NOT NULL CHECK (masuk_status IN ('hadir', 'terlambat', 'sakit', 'izin', 'alpa')),
    masuk_time TIMESTAMPTZ DEFAULT NOW(),
    pulang_status VARCHAR(20) DEFAULT NULL CHECK (pulang_status IN ('pulang')),
    pulang_time TIMESTAMPTZ DEFAULT NULL,
    device_fingerprint TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
  );$ddl$;

  -- Merge existing berangkat/pulang rows into single rows per student per day
  EXECUTE $migrate$INSERT INTO attendance_new (student_id, date, masuk_status, masuk_time, pulang_status, pulang_time, device_fingerprint, location_lat, location_lng, created_at)
  SELECT
    COALESCE(b.student_id, p.student_id),
    COALESCE(b.date, p.date),
    COALESCE(b.status, 'alpa'),
    b.timestamp,
    CASE WHEN p.id IS NOT NULL THEN 'pulang'::varchar(20) END,
    p.timestamp,
    COALESCE(b.device_fingerprint, p.device_fingerprint),
    COALESCE(b.location_lat, p.location_lat),
    COALESCE(b.location_lng, p.location_lng),
    COALESCE(b.created_at, p.created_at)
  FROM (SELECT * FROM attendance WHERE type = 'berangkat') b
  FULL OUTER JOIN (SELECT * FROM attendance WHERE type = 'pulang') p
    ON b.student_id = p.student_id AND b.date = p.date;$migrate$;

  EXECUTE $ddl$DROP TABLE attendance CASCADE;$ddl$;
  EXECUTE $ddl$ALTER TABLE attendance_new RENAME TO attendance;$ddl$;

  -- ================================================================
  -- 2. SUBJECT ATTENDANCES TABLE
  -- ================================================================

  EXECUTE $ddl$CREATE TABLE subject_attendances_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'alpa')),
    log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
  );$ddl$;

  -- Aggregate subject_attendances into single rows per student per day
  -- Each original row becomes an entry in the JSONB log
  EXECUTE $migrate$INSERT INTO subject_attendances_new (student_id, date, status, log, created_at, updated_at)
  SELECT
    student_id,
    date,
    (array_agg(status ORDER BY created_at DESC))[1],
    jsonb_agg(
      jsonb_build_object(
        'schedule_id', schedule_id,
        'status', status,
        'created_at', created_at
      ) ORDER BY created_at
    ),
    MIN(created_at),
    NOW()
  FROM subject_attendances
  GROUP BY student_id, date;$migrate$;

  EXECUTE $ddl$DROP TABLE subject_attendances CASCADE;$ddl$;
  EXECUTE $ddl$ALTER TABLE subject_attendances_new RENAME TO subject_attendances;$ddl$;

  -- ================================================================
  -- 3. INDEXES
  -- ================================================================

  EXECUTE $ddl$CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);$ddl$;
  EXECUTE $ddl$CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);$ddl$;
  EXECUTE $ddl$CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);$ddl$;
  EXECUTE $ddl$CREATE INDEX IF NOT EXISTS idx_subject_attendances_student_date ON subject_attendances(student_id, date);$ddl$;

  -- ================================================================
  -- 4. ROW LEVEL SECURITY POLICIES
  -- ================================================================

  EXECUTE $ddl$ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;$ddl$;
  EXECUTE $ddl$ALTER TABLE subject_attendances ENABLE ROW LEVEL SECURITY;$ddl$;

  -- Attendance policies
  EXECUTE $ddl$DROP POLICY IF EXISTS "Authenticated read attendance" ON attendance;$ddl$;
  EXECUTE $ddl$CREATE POLICY "Authenticated read attendance" ON attendance FOR SELECT USING (auth.role() = 'authenticated');$ddl$;

  EXECUTE $ddl$DROP POLICY IF EXISTS "Admin manage attendance" ON attendance;$ddl$;
  EXECUTE $ddl$CREATE POLICY "Admin manage attendance" ON attendance FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));$ddl$;

  EXECUTE $ddl$DROP POLICY IF EXISTS "Guru insert attendance" ON attendance;$ddl$;
  EXECUTE $ddl$CREATE POLICY "Guru insert attendance" ON attendance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'));$ddl$;

  EXECUTE $ddl$DROP POLICY IF EXISTS "Guru update attendance" ON attendance;$ddl$;
  EXECUTE $ddl$CREATE POLICY "Guru update attendance" ON attendance FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'));$ddl$;

  -- Subject attendances policies
  EXECUTE $ddl$DROP POLICY IF EXISTS "Authenticated read subject_attendances" ON subject_attendances;$ddl$;
  EXECUTE $ddl$CREATE POLICY "Authenticated read subject_attendances" ON subject_attendances FOR SELECT USING (auth.role() = 'authenticated');$ddl$;

  EXECUTE $ddl$DROP POLICY IF EXISTS "Guru write subject_attendances" ON subject_attendances;$ddl$;
  EXECUTE $ddl$CREATE POLICY "Guru write subject_attendances" ON subject_attendances FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'));$ddl$;

  EXECUTE $ddl$DROP POLICY IF EXISTS "Guru update subject_attendances" ON subject_attendances;$ddl$;
  EXECUTE $ddl$CREATE POLICY "Guru update subject_attendances" ON subject_attendances FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'));$ddl$;

END;
$migration$ LANGUAGE plpgsql;

COMMIT;
