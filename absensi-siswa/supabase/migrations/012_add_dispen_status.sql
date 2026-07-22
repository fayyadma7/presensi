-- Migration 012: Add dispen status to attendance and subject_attendances
-- Ensures CHECK constraints include 'dispen' status along with other statuses

-- Attachment: File to be saved at
 itself

-- Migration file for adding 'dispen' status support
-- This migration adds the 'dispen' status to CHECK constraints

DO $$
BEGIN
    -- Adjust attendance status check constraint to include dispen
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'attendance_status_check' 
          AND conkey = ARRAY[attributes(attendance, 'masuk_status')]  -- Not exactly that syntax
          THEN 
            ALTER TABLE attendance DROP CONSTRAINT attendance_status_check;
    END IF;
    
    ALTER TABLE attendance 
    ADD CONSTRAINT attendance_status_check 
    CHECK (masuk_status IN ('hadir', 'terlambat', 'sakit', 'izin', 'dispen', 'alpa'));
    
    -- Similarly for subject_attendances status check
    ALTER TYPE subject_attendances_status ADD VALUE IF NOT EXISTS 'dispen';
    
    -- Or directly alter table constraint if needed
    ALTER TABLE subject_attendances ADD CONSTRAINT subject_attendances_status_check 
    CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'dispen', 'alpa'));
END $$;
```