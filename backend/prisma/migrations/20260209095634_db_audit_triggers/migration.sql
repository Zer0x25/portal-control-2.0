-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSON := NULL;
    v_new_data JSON := NULL;
    v_details JSON;
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_json(OLD);
        v_new_data := to_json(NEW);
        v_details := json_build_object('old', v_old_data, 'new', v_new_data);
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_json(OLD);
        v_details := json_build_object('old', v_old_data);
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_json(NEW);
        v_details := json_build_object('new', v_new_data);
    END IF;

    INSERT INTO audit_logs (id, timestamp, actor_username, action, category, severity, outcome, details)
    VALUES (
        gen_random_uuid(),
        now(),
        'SYSTEM_DB_TRIGGER',
        TG_OP || '_' || TG_TABLE_NAME,
        'DATABASE',
        'INFO',
        'SUCCESS',
        v_details::text
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER audit_employees_trigger
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_system_configs_trigger
AFTER INSERT OR UPDATE OR DELETE ON system_configs
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_time_records_trigger
AFTER INSERT OR UPDATE OR DELETE ON time_records
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();