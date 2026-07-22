-- ============================================
-- HAPUS SEMUA DATA NON-ADMIN
-- Guru, Siswa, Kelas, Presensi, Jadwal
-- ============================================

BEGIN;

-- 1. Presensi per mapel
DELETE FROM teacher_subject_attendances;
DELETE FROM subject_attendances;

-- 2. Jadwal & guru pengampu
DELETE FROM schedules;
DELETE FROM teacher_subjects;

-- 3. Presensi harian
DELETE FROM teacher_attendance;
DELETE FROM attendance;

-- 4. Reset wali kelas & hapus siswa
DELETE FROM students;
UPDATE classes SET wali_kelas_id = NULL;

-- 5. Hapus kelas
DELETE FROM classes;

-- 6. Hapus user guru + siswa (cascade ke auth.users)
DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.users WHERE role IN ('guru', 'siswa')
);

COMMIT;
