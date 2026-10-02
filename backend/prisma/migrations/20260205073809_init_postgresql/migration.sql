-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Administrador', 'Supervisor_Elevado', 'Supervisor', 'Reloj_Control', 'Fiscalizador', 'Usuario', 'Archivado');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('Activo', 'Archivado');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'Usuario',
    "employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),
    "is_force_password_change" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "active_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT,
    "position" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "workday_type" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'Activo',
    "pin" TEXT,
    "is_pin_blocked" BOOLEAN NOT NULL DEFAULT false,
    "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_records" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "employee_position" TEXT,
    "employee_area" TEXT,
    "employee_workday_type" TEXT,
    "date" TEXT NOT NULL,
    "entrada" TEXT,
    "inicio_colacion" TEXT,
    "fin_colacion" TEXT,
    "salida" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Abierto',
    "source" TEXT NOT NULL DEFAULT 'SELF_SERVICE',
    "justification" TEXT,
    "entrada_latitude" DOUBLE PRECISION,
    "entrada_longitude" DOUBLE PRECISION,
    "salida_latitude" DOUBLE PRECISION,
    "salida_longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "scheduled_start_time" TEXT,
    "scheduled_end_time" TEXT,
    "scheduled_hours" DOUBLE PRECISION,
    "scheduled_colacion_minutes" INTEGER,
    "shift_pattern_id" TEXT,
    "shift_pattern_name" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "time_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_reports" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "shift_name" TEXT NOT NULL,
    "responsible_user" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "date" TIMESTAMP(3) NOT NULL,
    "log_entries" TEXT NOT NULL DEFAULT '[]',
    "supplier_entries" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shift_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_username" TEXT,
    "action" TEXT NOT NULL,
    "category" TEXT,
    "severity" TEXT,
    "outcome" TEXT,
    "details" TEXT,
    "metadata" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycle_length_days" INTEGER NOT NULL,
    "start_day_of_week" INTEGER,
    "daily_schedules" TEXT NOT NULL,
    "color" TEXT,
    "max_hours_pattern" DOUBLE PRECISION,
    "works_on_holidays" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "shift_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assigned_shifts" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "shift_pattern_id" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assigned_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Nacional',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_records" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_requests" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "time_record_id" TEXT NOT NULL,
    "record_field" TEXT NOT NULL,
    "original_value" TEXT NOT NULL,
    "requested_value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" TEXT NOT NULL,
    "meter_config_id" TEXT NOT NULL,
    "author_username" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_recharge" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_notes" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "report_type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "filters" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_employee_stats" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "total_worked_hours" DECIMAL(65,30) NOT NULL,
    "total_overtime" DECIMAL(65,30) NOT NULL,
    "total_scheduled" DECIMAL(65,30) NOT NULL,
    "tardiness_count" INTEGER NOT NULL,
    "absence_count" INTEGER NOT NULL,
    "vacation_days" INTEGER NOT NULL,
    "medical_leave_days" INTEGER NOT NULL,
    "daily_breakdown" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_employee_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE INDEX "users_updated_at_idx" ON "users"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "active_sessions_token_hash_key" ON "active_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "active_sessions_user_id_idx" ON "active_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_rut_key" ON "employees"("rut");

-- CreateIndex
CREATE INDEX "employees_updated_at_idx" ON "employees"("updated_at");

-- CreateIndex
CREATE INDEX "time_records_updated_at_idx" ON "time_records"("updated_at");

-- CreateIndex
CREATE INDEX "time_records_date_idx" ON "time_records"("date");

-- CreateIndex
CREATE INDEX "time_records_employee_id_idx" ON "time_records"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_reports_folio_key" ON "shift_reports"("folio");

-- CreateIndex
CREATE INDEX "shift_patterns_updated_at_idx" ON "shift_patterns"("updated_at");

-- CreateIndex
CREATE INDEX "assigned_shifts_updated_at_idx" ON "assigned_shifts"("updated_at");

-- CreateIndex
CREATE INDEX "assigned_shifts_employee_id_idx" ON "assigned_shifts"("employee_id");

-- CreateIndex
CREATE INDEX "assigned_shifts_start_date_idx" ON "assigned_shifts"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");

-- CreateIndex
CREATE INDEX "leave_records_updated_at_idx" ON "leave_records"("updated_at");

-- CreateIndex
CREATE INDEX "leave_records_employee_id_idx" ON "leave_records"("employee_id");

-- CreateIndex
CREATE INDEX "correction_requests_updated_at_idx" ON "correction_requests"("updated_at");

-- CreateIndex
CREATE INDEX "correction_requests_employee_id_idx" ON "correction_requests"("employee_id");

-- CreateIndex
CREATE INDEX "monthly_employee_stats_month_idx" ON "monthly_employee_stats"("month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_employee_stats_employee_id_month_key" ON "monthly_employee_stats"("employee_id", "month");

-- AddForeignKey
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_time_record_id_fkey" FOREIGN KEY ("time_record_id") REFERENCES "time_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
