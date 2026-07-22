-- ============================================
-- MIGRATION: Add settings table + wali_kelas_id
-- ============================================

-- 1. Settings table (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed default settings
INSERT INTO settings (key, value) VALUES
  ('school_name', 'SMK Muhammadiyah 3 Purbalingga'),
  ('morning_start', '06:30'),
  ('late_threshold', '07:00'),
  ('morning_end', '07:30'),
  ('afternoon_start', '14:00'),
  ('afternoon_end', '15:30'),
  ('geofence_radius', '100'),
  ('school_lat', '-7.4212'),
  ('school_lng', '109.4418'),
  ('auto_late', 'true')
ON CONFLICT (key) DO NOTHING;

-- 3. Add wali_kelas_id to classes
ALTER TABLE classes ADD COLUMN IF NOT EXISTS wali_kelas_id UUID REFERENCES users(id);

-- 4. RLS for settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read settings" ON settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage settings" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
