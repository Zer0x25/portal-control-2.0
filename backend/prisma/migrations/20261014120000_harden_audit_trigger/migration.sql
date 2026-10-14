-- Hardens audit_trigger_func to honor audit.skip_trigger, read audit.username,
-- redact sensitive credentials (pin, password_hash, SMTP_CONFIG), and skip redundant
-- seal-only updates on time_records.
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_username TEXT;
    v_skip TEXT;
BEGIN
    v_skip := COALESCE(current_setting('audit.skip_trigger', true), 'false');
    IF v_skip = 'true' THEN
        IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    -- Evitar duplicar auditoría cuando solo se actualiza el sello criptográfico en time_records
    IF (TG_TABLE_NAME = 'time_records' AND TG_OP = 'UPDATE') THEN
        IF (to_jsonb(OLD) - 'integrity_hash' - 'integrity_prev_hash' - 'integrity_algo' - 'integrity_version' - 'updated_at') =
           (to_jsonb(NEW) - 'integrity_hash' - 'integrity_prev_hash' - 'integrity_algo' - 'integrity_version' - 'updated_at') THEN
            RETURN NEW;
        END IF;
    END IF;

    v_username := COALESCE(NULLIF(current_setting('audit.username', true), ''), 'SYSTEM_DB_TRIGGER');

    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD) - 'pin' - 'password_hash';
        v_new_data := to_jsonb(NEW) - 'pin' - 'password_hash';
        IF TG_TABLE_NAME = 'system_configs' AND (v_old_data->>'key' = 'SMTP_CONFIG' OR v_new_data->>'key' = 'SMTP_CONFIG') THEN
            v_old_data := jsonb_set(v_old_data, '{value}', '"[REDACTED]"'::jsonb, false);
            v_new_data := jsonb_set(v_new_data, '{value}', '"[REDACTED]"'::jsonb, false);
        END IF;
        INSERT INTO audit_logs (id, timestamp, actor_username, action, category, severity, outcome, details)
        VALUES (
            gen_random_uuid(),
            NOW(),
            v_username,
            TG_TABLE_NAME || '_UPDATED_RAW',
            'CTRL_INTERNO_DB',
            'WARNING',
            'SUCCESS',
            jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'old', v_old_data, 'new', v_new_data)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD) - 'pin' - 'password_hash';
        IF TG_TABLE_NAME = 'system_configs' AND v_old_data->>'key' = 'SMTP_CONFIG' THEN
            v_old_data := jsonb_set(v_old_data, '{value}', '"[REDACTED]"'::jsonb, false);
        END IF;
        INSERT INTO audit_logs (id, timestamp, actor_username, action, category, severity, outcome, details)
        VALUES (
            gen_random_uuid(),
            NOW(),
            v_username,
            TG_TABLE_NAME || '_DELETED_RAW',
            'CTRL_INTERNO_DB',
            'CRITICAL',
            'SUCCESS',
            jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'old', v_old_data)
        );
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW) - 'pin' - 'password_hash';
        IF TG_TABLE_NAME = 'system_configs' AND v_new_data->>'key' = 'SMTP_CONFIG' THEN
            v_new_data := jsonb_set(v_new_data, '{value}', '"[REDACTED]"'::jsonb, false);
        END IF;
        INSERT INTO audit_logs (id, timestamp, actor_username, action, category, severity, outcome, details)
        VALUES (
            gen_random_uuid(),
            NOW(),
            v_username,
            TG_TABLE_NAME || '_INSERTED_RAW',
            'CTRL_INTERNO_DB',
            'INFO',
            'SUCCESS',
            jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP, 'new', v_new_data)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
