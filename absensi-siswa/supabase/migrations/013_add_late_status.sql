-- Migration 013: Add late_status column to attendance table
-- late_status is an annotation on top of masuk_status='hadir' for late arrivals

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_status VARCHAR;

-- Migrate existing records: masuk_status='terlambat' → masuk_status='hadir' + late_status='terlambat'
UPDATE attendance SET late_status = 'terlambat', masuk_status = 'hadir' WHERE masuk_status = 'terlambat';
