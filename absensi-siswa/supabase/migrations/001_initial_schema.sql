-- ============================================
-- DATABASE SCHEMA: Presensi Siswa SMK Muhammadiyah 3 Purbalingga
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. Jurusan
CREATE TABLE IF NOT EXISTS majors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Kelas
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  major_id UUID REFERENCES majors(id) ON DELETE CASCADE,
  grade_level INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Siswa
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Users (Guru/Admin) — managed by Supabase Auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guru' CHECK (role IN ('admin', 'guru')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Jadwal
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Kehadiran
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('berangkat', 'pulang')),
  status TEXT NOT NULL CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'alpa')),
  timestamp TIMESTAMPTZ DEFAULT now(),
  qr_code TEXT,
  device_fingerprint TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_major ON classes(major_id);
CREATE INDEX IF NOT EXISTS idx_schedules_class ON schedules(class_id);

-- 8. Seed Data: Jurusan
INSERT INTO majors (id, name) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Akuntansi dan Keuangan Lembaga'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Teknologi Farmasi')
ON CONFLICT (name) DO NOTHING;

-- 9. Seed Data: Kelas
INSERT INTO classes (id, name, major_id, grade_level) VALUES
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567801', 'X AKL 1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 10),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567802', 'X AKL 2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 10),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567803', 'XI AKL 1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 11),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567804', 'XI AKL 2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 11),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567805', 'XII AKL 1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 12),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567806', 'XII AKL 2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567801', 12),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567807', 'X TF 1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 10),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567808', 'X TF 2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 10),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567809', 'XI TF 1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 11),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567810', 'XI TF 2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 11),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567811', 'XII TF 1', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 12),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567812', 'XII TF 2', 'a1b2c3d4-e5f6-7890-abcd-ef1234567802', 12)
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Data: 10 Siswa sample
INSERT INTO students (nis, name, class_id) VALUES
  ('12001', 'Ahmad Fauzi', 'b1b2c3d4-e5f6-7890-abcd-ef1234567805'),
  ('12002', 'Budi Santoso', 'b1b2c3d4-e5f6-7890-abcd-ef1234567805'),
  ('12003', 'Citra Dewi', 'b1b2c3d4-e5f6-7890-abcd-ef1234567805'),
  ('12004', 'Dian Permata', 'b1b2c3d4-e5f6-7890-abcd-ef1234567806'),
  ('12005', 'Eko Prasetyo', 'b1b2c3d4-e5f6-7890-abcd-ef1234567806'),
  ('12006', 'Fitri Handayani', 'b1b2c3d4-e5f6-7890-abcd-ef1234567811'),
  ('12007', 'Gunawan Wibisono', 'b1b2c3d4-e5f6-7890-abcd-ef1234567811'),
  ('12008', 'Hana Larasati', 'b1b2c3d4-e5f6-7890-abcd-ef1234567812'),
  ('12009', 'Indra Kusuma', 'b1b2c3d4-e5f6-7890-abcd-ef1234567812'),
  ('12010', 'Joko Widodo', 'b1b2c3d4-e5f6-7890-abcd-ef1234567811')
ON CONFLICT (nis) DO NOTHING;

-- 11. RLS Policies
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated read majors" ON majors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read classes" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read students" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read schedules" ON schedules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated read attendance" ON attendance FOR SELECT USING (auth.role() = 'authenticated');

-- Admin full access
CREATE POLICY "Admin manage majors" ON majors FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admin manage classes" ON classes FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admin manage students" ON students FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admin manage users" ON users FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admin manage schedules" ON schedules FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY "Admin manage attendance" ON attendance FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Guru can insert attendance
CREATE POLICY "Guru insert attendance" ON attendance FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'));
CREATE POLICY "Guru update attendance" ON attendance FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'guru'));
