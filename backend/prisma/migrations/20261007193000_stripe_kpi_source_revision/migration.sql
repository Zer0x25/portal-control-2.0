-- Keep the existing total; distribute future transactional increments over 64 rows.
ALTER TABLE kpi_source_revision DROP CONSTRAINT kpi_source_revision_id_check;
ALTER TABLE kpi_source_revision ADD CONSTRAINT kpi_source_revision_id_check CHECK (id BETWEEN 1 AND 64);
INSERT INTO kpi_source_revision (id, revision)
  SELECT generate_series(2, 64), 0;

CREATE OR REPLACE FUNCTION advance_kpi_source_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  stripe_id integer := (pg_current_xact_id()::text::numeric % 64)::integer + 1;
BEGIN
  UPDATE kpi_source_revision SET revision = revision + 1 WHERE id = stripe_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Missing KPI source revision stripe';
  END IF;
  RETURN NULL;
END;
$$;
