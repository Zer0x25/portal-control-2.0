-- Outside public: restore/reset must never erase live admission/ownership.
CREATE SCHEMA IF NOT EXISTS portal_runtime;
CREATE TABLE IF NOT EXISTS portal_runtime.permits (
  id uuid PRIMARY KEY,
  owner uuid NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS portal_runtime.gate (
  id integer PRIMARY KEY CHECK (id = 1),
  maintenance_permit uuid REFERENCES portal_runtime.permits(id),
  operation text
);
INSERT INTO portal_runtime.gate (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS portal_runtime.locks (
  key text PRIMARY KEY,
  permit_id uuid NOT NULL REFERENCES portal_runtime.permits(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- No TTL: a lost process must not silently unlock a still-running external motor.
