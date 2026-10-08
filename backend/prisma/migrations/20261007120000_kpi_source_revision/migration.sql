-- A transactional generation shared by all monthly KPI inputs.
CREATE TABLE "kpi_source_revision" (
  "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
  "revision" BIGINT NOT NULL DEFAULT 0 CHECK ("revision" >= 0)
);
INSERT INTO "kpi_source_revision" ("id") VALUES (1);

CREATE FUNCTION advance_kpi_source_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE kpi_source_revision SET revision = revision + 1 WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Missing KPI source revision singleton';
  END IF;
  RETURN NULL;
END;
$$;

-- Statement triggers cover bulk writes, soft deletes and direct SQL as well as ORM writes.
CREATE TRIGGER kpi_source_changed BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON employees
  FOR EACH STATEMENT EXECUTE FUNCTION advance_kpi_source_revision();
CREATE TRIGGER kpi_source_changed BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON time_records
  FOR EACH STATEMENT EXECUTE FUNCTION advance_kpi_source_revision();
CREATE TRIGGER kpi_source_changed BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON assigned_shifts
  FOR EACH STATEMENT EXECUTE FUNCTION advance_kpi_source_revision();
CREATE TRIGGER kpi_source_changed BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON shift_patterns
  FOR EACH STATEMENT EXECUTE FUNCTION advance_kpi_source_revision();
CREATE TRIGGER kpi_source_changed BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON leave_records
  FOR EACH STATEMENT EXECUTE FUNCTION advance_kpi_source_revision();
CREATE TRIGGER kpi_source_changed BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON holidays
  FOR EACH STATEMENT EXECUTE FUNCTION advance_kpi_source_revision();
