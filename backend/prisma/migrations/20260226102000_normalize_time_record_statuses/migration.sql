-- Normalize legacy time_record statuses to canonical model.
UPDATE time_records
SET status = 'Laborando'
WHERE status = 'Abierto';

UPDATE time_records
SET status = 'Completado'
WHERE status IN ('Completo', 'Cerrado');

UPDATE time_records
SET status = 'AnomaliaManual'
WHERE status IN ('CierreAutomatico', 'CerradoBySystem');

ALTER TABLE time_records
ALTER COLUMN status SET DEFAULT 'Laborando';
