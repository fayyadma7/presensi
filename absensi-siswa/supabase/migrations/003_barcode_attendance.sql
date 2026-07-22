-- 003_barcode_attendance.sql
-- Add barcode column to students table

ALTER TABLE students ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Generate barcode for existing students (format: SIS{NIS})
-- Example: NIS '12001' -> barcode 'SIS12001'
UPDATE students 
SET barcode = 'SIS' || nis 
WHERE barcode IS NULL;

-- Create index for fast barcode lookup
CREATE INDEX IF NOT EXISTS idx_students_barcode ON students(barcode);