-- Migration 011: Fix race condition subject_attendances JSONB log
-- Atomic append to avoid two teachers overwriting each other's log entries
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION append_subject_attendance_log(
  p_student_id UUID,
  p_date DATE,
  p_status VARCHAR,
  p_log_entry JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO subject_attendances (student_id, date, status, log, updated_at)
  VALUES (
    p_student_id,
    p_date,
    p_status,
    jsonb_build_array(p_log_entry),
    NOW()
  )
  ON CONFLICT (student_id, date)
  DO UPDATE SET
    log = subject_attendances.log || p_log_entry,
    status = p_status,
    updated_at = NOW();
END;
$$;
