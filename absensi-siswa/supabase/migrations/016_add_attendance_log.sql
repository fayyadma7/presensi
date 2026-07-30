-- Migration 016: Add log column to attendance table

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS log JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION append_attendance_log(
  p_student_id UUID,
  p_date DATE,
  p_log_entry JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Because the app logic always upserts the attendance row first,
  -- we can safely just do an UPDATE here.
  UPDATE public.attendance
  SET log = COALESCE(log, '[]'::jsonb) || p_log_entry
  WHERE student_id = p_student_id AND date = p_date;
END;
$$;
