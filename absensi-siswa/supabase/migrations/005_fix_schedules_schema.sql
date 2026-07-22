-- Migration 005: Fix schedules schema conflict
-- The schedules table was already created in 001_initial_schema.sql with an old schema
-- (class_id, day, subject instead of teacher_subject_id, day_of_week, room).
-- We drop and recreate it along with dependent tables.

BEGIN;

-- Drop dependent tables first (CASCADE to handle any other dependencies)
DROP TABLE IF EXISTS teacher_subject_attendances CASCADE;
DROP TABLE IF EXISTS subject_attendances CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- Recreate schedules with new schema
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_subject_id UUID NOT NULL REFERENCES teacher_subjects(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read schedules" ON schedules;
CREATE POLICY "Authenticated read schedules"
  ON schedules FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin write schedules" ON schedules;
CREATE POLICY "Admin write schedules"
  ON schedules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Admin update schedules" ON schedules;
CREATE POLICY "Admin update schedules"
  ON schedules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Admin delete schedules" ON schedules;
CREATE POLICY "Admin delete schedules"
  ON schedules FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Recreate subject_attendances
CREATE TABLE subject_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'alpa')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, student_id, date)
);

ALTER TABLE subject_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read subject_attendances" ON subject_attendances;
CREATE POLICY "Authenticated read subject_attendances"
  ON subject_attendances FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Guru write subject_attendances" ON subject_attendances;
CREATE POLICY "Guru write subject_attendances"
  ON subject_attendances FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'
  ));

DROP POLICY IF EXISTS "Guru update subject_attendances" ON subject_attendances;
CREATE POLICY "Guru update subject_attendances"
  ON subject_attendances FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'
  ));

-- Recreate teacher_subject_attendances
CREATE TABLE teacher_subject_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('hadir_di_kelas', 'penugasan', 'alpa')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, teacher_id, date)
);

ALTER TABLE teacher_subject_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read teacher_subject_attendances" ON teacher_subject_attendances;
CREATE POLICY "Authenticated read teacher_subject_attendances"
  ON teacher_subject_attendances FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Guru write teacher_subject_attendances" ON teacher_subject_attendances;
CREATE POLICY "Guru write teacher_subject_attendances"
  ON teacher_subject_attendances FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'
  ));

DROP POLICY IF EXISTS "Guru update teacher_subject_attendances" ON teacher_subject_attendances;
CREATE POLICY "Guru update teacher_subject_attendances"
  ON teacher_subject_attendances FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'
  ));

COMMIT;
