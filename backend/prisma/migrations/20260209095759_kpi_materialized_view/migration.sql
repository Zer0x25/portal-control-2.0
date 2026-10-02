-- Design Materialized View for Monthly KPIs
-- This replicates the core logic of kpiService.ts at the database level
CREATE MATERIALIZED VIEW monthly_employee_kpis AS
WITH daily_stats AS (
    SELECT
        employee_id,
        employee_name,
        employee_area,
        date,
        -- Calculate worked hours considering colacion (if both punches exist)
        CASE 
            WHEN entrada IS NOT NULL AND salida IS NOT NULL AND entrada <> 'SIN REGISTRO' AND salida <> 'SIN REGISTRO'
            THEN 
                (EXTRACT(EPOCH FROM (salida::timestamp - entrada::timestamp)) / 3600) - 
                COALESCE(
                    CASE 
                        WHEN inicio_colacion IS NOT NULL AND fin_colacion IS NOT NULL 
                        AND inicio_colacion <> 'SIN REGISTRO' AND fin_colacion <> 'SIN REGISTRO'
                        THEN EXTRACT(EPOCH FROM (fin_colacion::timestamp - inicio_colacion::timestamp)) / 3600
                        ELSE 0
                    END, 
                    0
                )
            ELSE 0 
        END as worked_hours,
        COALESCE(scheduled_hours, 0) as scheduled_hours,
        status,
        date::DATE as db_date
    FROM time_records
    WHERE is_deleted = false
)
SELECT
    employee_id,
    employee_name,
    employee_area,
    TO_CHAR(db_date, 'YYYY-MM') as month,
    CAST(SUM(worked_hours) AS DECIMAL(10,2)) as total_worked,
    CAST(SUM(scheduled_hours) AS DECIMAL(10,2)) as total_scheduled,
    CAST(SUM(CASE WHEN worked_hours > scheduled_hours THEN worked_hours - scheduled_hours ELSE 0 END) AS DECIMAL(10,2)) as total_overtime,
    COUNT(CASE WHEN status = 'Ausente' THEN 1 END)::INTEGER as absence_count,
    COUNT(CASE WHEN status = 'Atraso' THEN 1 END)::INTEGER as tardiness_count
FROM daily_stats
GROUP BY employee_id, employee_name, employee_area, month;

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX idx_monthly_kpis_emp_month ON monthly_employee_kpis (employee_id, month);

-- Procedure to refresh KPIs
CREATE OR REPLACE FUNCTION refresh_monthly_kpis()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_employee_kpis;
END;
$$ LANGUAGE plpgsql;