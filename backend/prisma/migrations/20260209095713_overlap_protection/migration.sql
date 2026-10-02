-- Create function to prevent overlapping shift assignments
CREATE OR REPLACE FUNCTION prevent_assigned_shift_overlap()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for overlaps
    -- Assuming start_date and end_date are YYYY-MM-DD strings
    IF EXISTS (
        SELECT 1 FROM assigned_shifts
        WHERE employee_id = NEW.employee_id
        AND id <> NEW.id
        AND is_deleted = false
        AND (
            -- Case 1: NEW has no end date (active indefinitely)
            (NEW.end_date IS NULL AND (end_date IS NULL OR end_date >= NEW.start_date))
            OR
            -- Case 2: NEW has end date
            (NEW.end_date IS NOT NULL AND (
                (end_date IS NULL AND start_date <= NEW.end_date)
                OR
                (start_date <= NEW.end_date AND end_date >= NEW.start_date)
            ))
        )
    ) THEN
        RAISE EXCEPTION 'Employee already has a shift assignment that overlaps with this period.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
CREATE TRIGGER prevent_shift_overlap_trigger
BEFORE INSERT OR UPDATE ON assigned_shifts
FOR EACH ROW EXECUTE FUNCTION prevent_assigned_shift_overlap();