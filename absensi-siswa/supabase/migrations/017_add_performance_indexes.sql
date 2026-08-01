-- Indeks untuk query presensi yang paling sering digunakan aplikasi.
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date
  ON teacher_attendance (teacher_id, date);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_attendance_teacher_date_schedule
  ON teacher_subject_attendances (teacher_id, date, schedule_id);

-- Mendukung rekap berdasarkan rentang tanggal dan daftar siswa.
CREATE INDEX IF NOT EXISTS idx_attendance_date_student
  ON attendance (date, student_id);
