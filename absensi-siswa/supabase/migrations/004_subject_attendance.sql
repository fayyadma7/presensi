-- Migration 004: Presensi Per Mata Pelajaran
-- Creates tables for subject-based attendance system:
--   subjects, teacher_subjects, schedules, subject_attendances, teacher_subject_attendances

BEGIN;

-- Subjects (Mata Pelajaran)
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read subjects" ON subjects;
CREATE POLICY "Authenticated read subjects"
  ON subjects FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin write subjects" ON subjects;
CREATE POLICY "Admin write subjects"
  ON subjects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Admin update subjects" ON subjects;
CREATE POLICY "Admin update subjects"
  ON subjects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Admin delete subjects" ON subjects;
CREATE POLICY "Admin delete subjects"
  ON subjects FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Teacher Subjects (Guru Pengampu)
CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read teacher_subjects" ON teacher_subjects;
CREATE POLICY "Authenticated read teacher_subjects"
  ON teacher_subjects FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin write teacher_subjects" ON teacher_subjects;
CREATE POLICY "Admin write teacher_subjects"
  ON teacher_subjects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "Admin delete teacher_subjects" ON teacher_subjects;
CREATE POLICY "Admin delete teacher_subjects"
  ON teacher_subjects FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Schedules (Jadwal Pelajaran)
CREATE TABLE IF NOT EXISTS schedules (
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

-- Subject Attendances (Presensi Siswa per Mapel)
CREATE TABLE IF NOT EXISTS subject_attendances (
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

-- Teacher Subject Attendances (Presensi Guru per Mapel)
CREATE TABLE IF NOT EXISTS teacher_subject_attendances (
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

-- Ensure attendance table has the unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_date_type_unique'
  ) THEN
    ALTER TABLE attendance ADD CONSTRAINT attendance_student_date_type_unique UNIQUE (student_id, date, type);
  END IF;
END $$;

COMMIT;
