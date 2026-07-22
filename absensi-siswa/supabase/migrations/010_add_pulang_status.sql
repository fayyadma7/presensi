-- Tambah value 'pulang' ke CHECK constraint status di teacher_attendance
ALTER TABLE teacher_attendance DROP CONSTRAINT IF EXISTS teacher_attendance_status_check;
ALTER TABLE teacher_attendance ADD CONSTRAINT teacher_attendance_status_check 
  CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'alpa', 'pulang'));
