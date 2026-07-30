-- Migration 012: Add dispen status to attendance and subject_attendances
-- Ensures CHECK constraints include 'dispen' status along with other statuses


-- Migration file for adding 'dispen' status support
-- This migration adds the 'dispen' status to CHECK constraints

DO $$
BEGIN
    -- Adjust attendance status check constraint to include dispen
    ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
    ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_masuk_status_check;
    
    ALTER TABLE attendance 
    ADD CONSTRAINT attendance_masuk_status_check 
    CHECK (masuk_status IN ('hadir', 'terlambat', 'sakit', 'izin', 'dispen', 'alpa'));
    
    -- Similarly for subject_attendances status check
    ALTER TABLE subject_attendances DROP CONSTRAINT IF EXISTS subject_attendances_status_check;
    ALTER TABLE subject_attendances ADD CONSTRAINT subject_attendances_status_check 
    CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'dispen', 'alpa', 'tidak_hadir'));
END $$;