-- Migration 014: Add missing RLS policies for students (attendance) and tenaga_kependidikan (teacher_attendance)
-- Students couldn't submit Sakit/Izin, tenaga_kependidikan couldn't do any attendance at all.

-- ============ ATTENDANCE (Siswa) ============
-- Existing policies: SELECT all auth, INSERT/UPDATE only guru. Students need INSERT/UPDATE for their own records.

DROP POLICY IF EXISTS "Students insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Students update own attendance" ON attendance;

CREATE POLICY "Students insert own attendance" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update own attendance" ON attendance
  FOR UPDATE USING (auth.uid() = student_id);

-- ============ TEACHER_ATTENDANCE (Guru & Tenaga Kependidikan) ============
-- Existing policies likely only allow guru. Tenaga kependidikan needs the same access.

DROP POLICY IF EXISTS "Users insert own teacher_attendance" ON teacher_attendance;
DROP POLICY IF EXISTS "Users update own teacher_attendance" ON teacher_attendance;

CREATE POLICY "Users insert own teacher_attendance" ON teacher_attendance
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Users update own teacher_attendance" ON teacher_attendance
  FOR UPDATE USING (auth.uid() = teacher_id);
