/**
 * Tabla canónica de claves de query (spec 034, T20-T23).
 *
 * **Única fuente de verdad**: las claves de TanStack Query no se escriben como
 * arrays literales en el código, se toman de aquí. Así:
 *
 * - Una invalidación nunca queda huérfana: si la query y la invalidación
 *   comparten constructor, comparten clave por construcción (T23).
 * - El guardrail (T25) puede verificar que **toda** raíz usada en el código
 *   está declarada y clasificada (persistida o sensible).
 * - Un recurso tiene **una** raíz: `["reports"]` y `["shiftReports"]` eran el
 *   mismo recurso (bitácora de turno) con dos raíces, y la invalidación de
 *   `["reports"]` no alcanzaba a la query de `["shiftReports"]` (T17).
 *
 * Reglas de la tabla:
 * - La **raíz** (primer elemento) es canónica: `camelCase`, sin guiones.
 * - Cada constructor devuelve un array `readonly` nuevo: TanStack compara por
 *   hash, no por referencia.
 * - Las claves de sub-recurso se construyen con una función
 *   (`config(key)`, `shiftReportsList(params)`), nunca con literales en el
 *   consumidor.
 */

/**
 * Crea un constructor de clave y anota su raíz.
 *
 * La raíz anotada es lo que permite al guardrail de T25 comprobar, sin parsear
 * literales, que toda raíz usada está clasificada en `PERSISTED_QUERY_ROOTS`
 * o `SENSITIVE_QUERY_ROOTS`.
 */
const resource = <T extends (...args: never[]) => readonly unknown[]>(
  root: string,
  build: T,
): T & { root: string } => Object.assign(build, { root });

/** Raíces de query, por recurso. */
export const queryKeys = {
  /* --- Cuentas y personas --- */
  /** Cuentas de usuario. Raíz sensible (PII). */
  users: resource("users", () => ["users"] as const),
  /** Listado de empleados. */
  employees: resource("employees", () => ["employees"] as const),
  /** Proyección mínima para las pantallas de Control de Horario. */
  employeeClockingOptions: resource("employees", () => ["employees", "clockingOptions"] as const),
  /** Listado de empleados para el kiosk (unico worker). */
  employeesKiosk: resource("employees", () => ["employees", "kiosk"] as const),

  /* --- Configuración --- */
  /** Prefijo de la raiz `config` (invalida todas las claves de configuracion). */
  configRoot: resource("config", () => ["config"] as const),
  /** Valor de configuración por clave (`accounting_lock_date`, ...). */
  config: resource("config", (key: string) => ["config", key] as const),
  /** Configuración pública (branding). */
  configPublic: resource("config", (key: string) => ["config", "public", key] as const),

  /* --- Turnos y patrones --- */
  /** Patrones de turno. */
  shiftPatterns: resource("shiftPatterns", () => ["shiftPatterns"] as const),
  /** Patrones de turno con paginacion infinita. */
  shiftPatternsInfinite: resource(
    "shiftPatterns",
    (params: unknown) => ["shiftPatterns", "infinite", params] as const,
  ),
  /** Asignaciones de turno. */
  assignedShifts: resource("assignedShifts", () => ["assignedShifts"] as const),
  /** Asignaciones de turno con filtros. */
  assignedShiftsList: resource(
    "assignedShifts",
    (filters: unknown) => ["assignedShifts", filters] as const,
  ),

  /* --- Marcaciones y tiempos --- */
  /** Marcaciones de tiempo. */
  timeRecords: resource("timeRecords", () => ["timeRecords"] as const),
  /** Marcaciones de tiempo con filtros. */
  timeRecordsList: resource("timeRecords", (params: unknown) => ["timeRecords", params] as const),
  /** Ultima marcacion de un empleado. */
  timeRecordsLast: resource(
    "timeRecords",
    (employeeId: string) => ["timeRecords", "last", employeeId] as const,
  ),

  /* --- Lectores --- */
  /** Lecturas de medidores. */
  meterReadings: resource("meterReadings", () => ["meterReadings"] as const),
  /** Lecturas de medidores con paginacion infinita. */
  meterReadingsInfinite: resource(
    "meterReadings",
    (filters: unknown) => ["meterReadings", "infinite", filters] as const,
  ),

  /* --- Anotaciones, permisos y feriados --- */
  /** Notas rapidas. */
  notes: resource("notes", () => ["notes"] as const),
  /** Ausencias y permisos. */
  leaves: resource("leaves", () => ["leaves"] as const),
  /** Ausencias y permisos con filtros. */
  leavesList: resource("leaves", (filters: unknown) => ["leaves", filters] as const),
  /** Feriados. */
  holidays: resource("holidays", () => ["holidays"] as const),
  /** Feriados con paginacion infinita. */
  holidaysInfinite: resource(
    "holidays",
    (params: unknown) => ["holidays", "infinite", params] as const,
  ),

  /* --- Calendario --- */
  /** Prefijo de la raiz `calendarMatrix` (invalida la matriz completa). */
  calendarMatrix: resource("calendarMatrix", () => ["calendarMatrix"] as const),
  /** Matriz de calendario por rango y empleados (la vista de planificacion). */
  calendarMatrixRange: resource(
    "calendarMatrix",
    (startDate: string, endDate: string, employeeIds?: string[]) =>
      ["calendarMatrix", startDate, endDate, employeeIds] as const,
  ),

  /* --- Correcciones --- */
  /** Solicitudes de correccion de marcacion. */
  correctionRequests: resource("correctionRequests", () => ["correctionRequests"] as const),
  /** Solicitudes de correccion con filtros. */
  correctionRequestsList: resource(
    "correctionRequests",
    (params: unknown) => ["correctionRequests", params] as const,
  ),
  /** Estadisticas de correccion. */
  correctionRequestsStats: resource(
    "correctionRequests",
    () => ["correctionRequests", "stats"] as const,
  ),

  /* --- Historial --- */
  /** Historial de un registro. */
  recordHistory: resource(
    "recordHistory",
    (recordId: string | null) => ["recordHistory", recordId] as const,
  ),

  /* --- Bitacora de turno (unico recurso: antes `reports` y `shiftReports`) --- */
  /** Bitacoras de turno. */
  shiftReports: resource("shiftReports", () => ["shiftReports"] as const),
  /** Bitacoras de turno con filtros. */
  shiftReportsList: resource(
    "shiftReports",
    (params: unknown) => ["shiftReports", params] as const,
  ),

  /* --- Dashboard --- */
  /** Dashboard (raiz). */
  dashboard: resource("dashboard", () => ["dashboard"] as const),
  /** Resumen del dashboard. */
  dashboardOverview: resource("dashboard", () => ["dashboard", "overview"] as const),
  /** Planificacion diaria del dashboard. */
  dashboardDailyPlanning: resource("dashboard", () => ["dashboard", "dailyPlanning"] as const),
  /** Actividad reciente del dashboard. */
  dashboardRecentActivity: resource("dashboard", () => ["dashboard", "recentActivity"] as const),

  /* --- Analiticas --- */
  /** Analiticas de asistencia (agregado diario, sin PII por empleado). */
  attendanceAnalytics: resource(
    "attendanceAnalytics",
    (startDate: string, endDate: string) => ["attendanceAnalytics", startDate, endDate] as const,
  ),
  /** KPIs del panel de supervisor (detalle por empleado: raiz sensible). */
  kpis: resource(
    "kpis",
    (params: { startDate: string; endDate: string; employeeIds: string[] }) =>
      ["kpis", params] as const,
  ),

  /* --- Auditoria y diagnostico (raices sensibles) --- */
  /** Auditoria. */
  auditLogs: resource("auditLogs", () => ["auditLogs"] as const),
  /** Auditoria con filtros. */
  auditLogsList: resource("auditLogs", (params: unknown) => ["auditLogs", params] as const),
  /** Detecciones proactivas de auditoria. */
  auditLogsProactiveDetections: resource(
    "auditLogs",
    () => ["auditLogs", "proactive-detections"] as const,
  ),
  /** Estado de integridad de la auditoria. */
  integrityStatus: resource("integrityStatus", () => ["integrityStatus"] as const),
  /** Salud del sistema. */
  systemHealth: resource("system", () => ["system", "health"] as const),
  /** Readiness ligero para conexión y validación de instancia al arrancar. */
  systemReadiness: resource("system", () => ["system", "readiness"] as const),
} as const;

/**
 * Raíces usadas en el código, derivadas de la tabla.
 *
 * El guardrail de T25 compara esta lista con `PERSISTED_QUERY_ROOTS` y
 * `SENSITIVE_QUERY_ROOTS` (de `src/lib/queryCache.ts`): toda raíz usada
 * debe estar clasificada en una de las dos.
 */
export const QUERY_ROOTS: readonly string[] = Array.from(
  new Set(Object.values(queryKeys).map((builder) => builder.root)),
).sort();
