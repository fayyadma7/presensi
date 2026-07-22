-- Migration 015: Add 'tidak_hadir' status support
-- This adds the 'tidak_hadir' status to the check constraints for subject_attendances
-- and also for attendance just in case it is needed in the future.

BEGIN;

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- 1. For attendance table
    -- Find and drop the existing check constraint for masuk_status
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
    WHERE rel.relname = 'attendance' 
      AND pg_get_constraintdef(con.oid) LIKE '%masuk_status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE attendance DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;

    -- Add the new constraint
    ALTER TABLE attendance 
    ADD CONSTRAINT attendance_masuk_status_check 
    CHECK (masuk_status IN ('hadir', 'terlambat', 'sakit', 'izin', 'dispen', 'alpa', 'tidak_hadir'));

    -- 2. For subject_attendances table
    -- Find and drop the existing check constraint for status
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
    WHERE rel.relname = 'subject_attendances' 
      AND pg_get_constraintdef(con.oid) LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE subject_attendances DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;

    -- Add the new constraint
    ALTER TABLE subject_attendances 
    ADD CONSTRAINT subject_attendances_status_check 
    CHECK (status IN ('hadir', 'terlambat', 'sakit', 'izin', 'dispen', 'alpa', 'tidak_hadir'));
END $$;

COMMIT;
