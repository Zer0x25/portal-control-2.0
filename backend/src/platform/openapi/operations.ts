// Public API contract; independent of HTTP server adapters.

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Lista todos los usuarios (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para consulta delta
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Cantidad de items por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (nombre o username)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filtro por rol
 *     responses:
 *       200:
 *         description: Lista de usuarios o respuesta paginada
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, role]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               employeeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     summary: Actualiza un usuario existente
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUser'
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Elimina un usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Usuario eliminado
 */

/**
 * @openapi
 * /api/records/punch:
 *   post:
 *     summary: Registra una nueva marcación (entrada/salida)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Punch'
 *     responses:
 *       200:
 *         description: Marcaje exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PunchResponse'
 */

/**
 * @openapi
 * /api/records/export:
 *   get:
 *     summary: Exportación masiva de marcaciones para nómina
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv, xml, excel] }
 *     responses:
 *       200:
 *         description: Archivo exportado o JSON
 */

/**
 * @openapi
 * /api/records:
 *   get:
 *     summary: Obtiene historial de marcaciones
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: since
 *         schema: { type: string }
 *       - in: query
 *         name: desde
 *         schema: { type: string }
 *       - in: query
 *         name: hasta
 *         schema: { type: string }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: area
 *         schema: { type: string }
 *       - in: query
 *         name: workdayType
 *         schema: { type: string }
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de registros
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeRecordListResponse'
 */

/**
 * @openapi
 * /api/records:
 *   post:
 *     summary: Crea o actualiza un registro individual
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TimeRecordWrite'
 *     responses:
 *       200:
 *         description: Registro guardado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceRecordResponse'
 */

/**
 * @openapi
 * /api/records/bulk:
 *   post:
 *     summary: Crea múltiples registros manualmente
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/TimeRecordWrite'
 *     responses:
 *       200:
 *         description: Carga masiva exitosa
 */

/**
 * @openapi
 * /api/records/auto-close:
 *   post:
 *     summary: Dispara proceso de cierre automático de jornadas
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proceso ejecutado
 */

/**
 * @openapi
 * /api/records/integrity/verify:
 *   get:
 *     summary: Verifica la integridad de la cadena de marcajes
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 */

/**
 * @openapi
 * /api/records/{id}/resolve-anomaly:
 *   post:
 *     summary: Resuelve una anomalía (Ausencia, Omitir Salida, Permiso Especial, Día Libre o Vacaciones)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [ABSENCE_MARK, SHIFT_HOURS_ACK, PERMIT_MARK, DAY_OFF_MARK, VACATION_MARK]
 *     responses:
 *       200:
 *         description: Anomalía resuelta
 */

/**
 * @openapi
 * /api/records/{id}:
 *   delete:
 *     summary: Elimina un registro de marcación
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Registro eliminado
 */

/**
 * @openapi
 * /api/shifts/patterns:
 *   get:
 *     summary: Obtiene los patrones de turno teóricos
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *       - in: query
 *         name: showArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de patrones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftPattern'
 */

/**
 * @openapi
 * /api/shifts/patterns:
 *   post:
 *     summary: Crea un nuevo patrón de turno
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftPattern'
 *     responses:
 *       201:
 *         description: Patrón creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftPattern'
 */

/**
 * @openapi
 * /api/shifts/patterns/bulk:
 *   post:
 *     summary: Carga masiva de patrones de turno
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/ShiftPattern'
 *     responses:
 *       201:
 *         description: Resumen de carga
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 */

/**
 * @openapi
 * /api/shifts/patterns/{id}:
 *   put:
 *     summary: Actualiza un patrón existente
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftPattern'
 *     responses:
 *       200:
 *         description: Patrón actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftPattern'
 */

/**
 * @openapi
 * /api/shifts/patterns/{id}:
 *   delete:
 *     summary: Elimina un patrón de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Patrón eliminado
 */

/**
 * @openapi
 * /api/shifts/assignments:
 *   get:
 *     summary: Obtiene turnos asignados a empleados
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *       - in: query
 *         name: showArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssignedShift'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */

/**
 * @openapi
 * /api/shifts/assignments:
 *   post:
 *     summary: Asigna un turno a un empleado
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignedShift'
 *     responses:
 *       201:
 *         description: Asignación creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignedShift'
 */

/**
 * @openapi
 * /api/shifts/assignments/bulk:
 *   post:
 *     summary: Asignación masiva de turnos
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/AssignedShift'
 *     responses:
 *       201:
 *         description: Resumen de asignaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 */

/**
 * @openapi
 * /api/shifts/assignments/{id}:
 *   put:
 *     summary: Actualiza una asignación de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignedShift'
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignedShift'
 */

/**
 * @openapi
 * /api/shifts/assignments/{id}:
 *   delete:
 *     summary: Elimina una asignación de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Asignación eliminada
 */

/**
 * @openapi
 * /api/shifts/schedule/employee/{id}:
 *   get:
 *     summary: Obtiene horario de un empleado para una fecha
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Detalles del horario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleInfo'
 */

/**
 * @openapi
 * /api/shifts/schedule/employees-on-date:
 *   get:
 *     summary: Lista empleados programados en una fecha
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Lista de empleados programados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employeeId:
 *                     type: string
 *                   employeeName:
 *                     type: string
 *                   shiftPatternName:
 *                     type: string
 *                   startTime:
 *                     type: string
 *                   endTime:
 *                     type: string
 *                   patternColor:
 *                     type: string
 */

/**
 * @openapi
 * /api/shifts/schedule/employee/{id}/month:
 *   get:
 *     summary: Obtiene horario mensual de un empleado
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Calendario mensual
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MonthlyScheduleView'
 */

/**
 * @openapi
 * /api/shifts/schedule/matrix:
 *   post:
 *     summary: Genera matriz de calendario para vista grupal
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               employeeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Matriz de horarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 additionalProperties:
 *                   $ref: '#/components/schemas/ScheduleInfo'
 */

/**
 * @openapi
 * /api/shifts/monthly-plan/{employeeId}/{year}/{month}:
 *   get:
 *     summary: Obtiene asistente de planificación mensual
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planificación mensual actual
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MonthlyScheduleView'
 */

/**
 * @openapi
 * /api/shifts/monthly-plan:
 *   post:
 *     summary: Guarda planificación mensual completa
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *               month:
 *                 type: string
 *               year:
 *                 type: string
 *               patternName:
 *                 type: string
 *               dailySchedules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                     type:
 *                       type: string
 *                       enum: [work, rest]
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     hours:
 *                       type: number
 *     responses:
 *       200:
 *         description: Resultado de la operación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @openapi
 * /api/shifts/suggest-pattern-name:
 *   get:
 *     summary: Sugiere nombres para nuevos patrones de turno
 *     tags: [Shifts]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nombre sugerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuggestedPatternName'
 */

/**
 * @openapi
 * /api/shifts/validate-conflicts:
 *   post:
 *     summary: Valida conflictos de solapamiento de turnos
 *     tags: [Shifts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employeeId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               excludeAssignmentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resultado de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasConflicts:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 conflicts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AssignedShift'
 */

/**
 * @openapi
 * /api/shift-reports:
 *   get:
 *     summary: Obtener todas las bitácoras de turno
 *     tags: [ShiftReports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de bitácoras
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShiftReportListResponse'
 */

/**
 * @openapi
 * /api/shift-reports:
 *   post:
 *     summary: Crear o actualizar una bitácora de turno
 *     tags: [ShiftReports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ShiftReport'
 *     responses:
 *       200:
 *         description: Bitácora guardada
 */

/**
 * @openapi
 * /api/shift-reports/export/{id}:
 *   get:
 *     summary: Exportar bitácora de turno a Excel
 *     tags: [ShiftReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo Excel
 */

/**
 * @openapi
 * /api/scheduled-reports:
 *   get:
 *     summary: Obtener todos los reportes programados
 *     tags: [ScheduledReports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reportes programados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduledReportListResponse'
 */

/**
 * @openapi
 * /api/scheduled-reports:
 *   post:
 *     summary: Crear un nuevo reporte programado
 *     tags: [ScheduledReports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduledReportInput'
 *     responses:
 *       201:
 *         description: Reporte creado
 */

/**
 * @openapi
 * /api/scheduled-reports/{id}:
 *   get:
 *     summary: Obtener un reporte programado por ID
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reporte programado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduledReport'
 */

/**
 * @openapi
 * /api/scheduled-reports/{id}:
 *   put:
 *     summary: Actualizar un reporte programado
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduledReportUpdate'
 *     responses:
 *       200:
 *         description: Reporte actualizado
 */

/**
 * @openapi
 * /api/scheduled-reports/{id}:
 *   delete:
 *     summary: Eliminar un reporte programado
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reporte eliminado
 */

/**
 * @openapi
 * /api/scheduled-reports/{id}/toggle:
 *   patch:
 *     summary: Alternar estado activo/inactivo del reporte
 *     tags: [ScheduledReports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado alternado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @openapi
 * /api/notes:
 *   get:
 *     summary: Obtener notas rápidas
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para obtener notas desde una fecha
 *     responses:
 *       200:
 *         description: Lista de notas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickNoteListResponse'
 */

/**
 * @openapi
 * /api/notes:
 *   post:
 *     summary: Crear una nueva nota rápida
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuickNote'
 *     responses:
 *       201:
 *         description: Nota creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickNoteResponse'
 */

/**
 * @openapi
 * /api/notes/{id}:
 *   put:
 *     summary: Archivar/Marcar nota como leída
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nota archivada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuickNoteResponse'
 */

/**
 * @openapi
 * /api/notes/{id}:
 *   delete:
 *     summary: Eliminar una nota rápida
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nota eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @openapi
 * /api/meters:
 *   get:
 *     summary: Obtiene lecturas de medidores (soporta paginación)
 *     tags: [Meters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000000
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-(0[1-9]|1[0-2])$'
 *         description: Mes de Chile, excluyente con startDate/endDate
 *       - in: query
 *         name: meterId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para consulta delta
 *     responses:
 *       200:
 *         description: Lista de lecturas
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/PaginatedMeterReadingResponse'
 *                 - $ref: '#/components/schemas/MeterReadingListResponse'
 */

/**
 * @openapi
 * /api/meters/bulk:
 *   post:
 *     summary: Registra lecturas de medidores en lote
 *     tags: [Meters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/MeterReading'
 *     responses:
 *       201:
 *         description: Lecturas registradas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeterReadingListResponse'
 */

/**
 * @openapi
 * /api/maintenance/clear-database:
 *   delete:
 *     summary: Limpiar toda la base de datos (Admin)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Base de datos limpiada
 */

/**
 * @openapi
 * /api/maintenance/seed:
 *   post:
 *     summary: Sembrar base de datos completa
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SeedOptions'
 *     responses:
 *       200:
 *         description: Siembra completada
 */

/**
 * @openapi
 * /api/maintenance/seed/phase1:
 *   post:
 *     summary: Ejecutar Fase 1 de siembra (Maestros)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fase 1 completada
 */

/**
 * @openapi
 * /api/maintenance/seed/phase2/start:
 *   post:
 *     summary: Iniciar Fase 2 de siembra (Transaccional)
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Proceso iniciado
 */

/**
 * @openapi
 * /api/maintenance/seed/phase2/pause:
 *   post:
 *     summary: Pausar siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Pausado
 */

/**
 * @openapi
 * /api/maintenance/seed/phase2/resume:
 *   post:
 *     summary: Reanudar siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Reanudado
 */

/**
 * @openapi
 * /api/maintenance/seed/phase2/stop:
 *   post:
 *     summary: Detener siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Detenido
 */

/**
 * @openapi
 * /api/maintenance/seed/phase2/status:
 *   get:
 *     summary: Obtener estado de siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Estado actual
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SeedStatus'
 */

/**
 * @openapi
 * /api/maintenance/seed/phase2/logs:
 *   get:
 *     summary: Obtener logs de siembra Fase 2
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Lista de logs
 */

/**
 * @openapi
 * /api/leaves:
 *   get:
 *     summary: Obtiene lista de ausencias/permisos
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para obtener ausencias desde una fecha (ms)
 *       - in: query
 *         name: showArchived
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de ausencias obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedLeaveResponse'
 */

/**
 * @openapi
 * /api/leaves:
 *   post:
 *     summary: Registra una nueva ausencia o permiso
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveRecord'
 *     responses:
 *       201:
 *         description: Ausencia registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeaveResponse'
 */

/**
 * @openapi
 * /api/leaves/{id}:
 *   delete:
 *     summary: Elimina un registro de ausencia
 *     tags: [Leaves]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ausencia eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @openapi
 * /api/kpis/summary:
 *   post:
 *     summary: Obtener resumen de KPIs
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KpiSummaryRequest'
 *     responses:
 *       200:
 *         description: Resumen de KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 */

/**
 * @openapi
 * /api/kpis/detailed-report:
 *   post:
 *     summary: Generar reporte detallado de KPIs
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KpiSummaryRequest'
 *     responses:
 *       200:
 *         description: Reporte detallado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 report: { type: array, items: { type: object } }
 */

/**
 * @openapi
 * /api/kpis/overview:
 *   get:
 *     summary: Obtener vista general del dashboard
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vista general
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardOverview'
 */

/**
 * @openapi
 * /api/kpis/daily-planning:
 *   get:
 *     summary: Obtener resumen de planificación diaria
 *     tags: [KPIs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Planificación diaria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date: { type: string, format: date }
 *                 stats: { type: object }
 */

/**
 * @openapi
 * /api/import/preview:
 *   post:
 *     summary: Previsualizar contenido de un archivo Excel
 *     tags: [Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               schema:
 *                 type: string
 *                 description: JSON string of the mapping schema
 *     responses:
 *       200:
 *         description: Datos extraídos del archivo
 */

/**
 * @openapi
 * /api/holidays:
 *   get:
 *     summary: Obtiene la lista de feriados registrados
 *     tags: [Holidays]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *         description: Timestamp para consulta delta
 *     responses:
 *       200:
 *         description: Lista de feriados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Holiday'
 */

/**
 * @openapi
 * /api/holidays:
 *   post:
 *     summary: Crea un feriado manualmente
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Holiday'
 *     responses:
 *       201:
 *         description: Feriado creado
 */

/**
 * @openapi
 * /api/holidays/sync:
 *   post:
 *     summary: Sincroniza feriados con una API externa (Boostr)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Resultado de la sincronización
 */

/**
 * @openapi
 * /api/holidays/bulk:
 *   post:
 *     summary: Carga masiva de feriados
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Holiday'
 *     responses:
 *       201:
 *         description: Feriados creados
 */

/**
 * @openapi
 * /api/holidays/{id}:
 *   delete:
 *     summary: Elimina un feriado
 *     tags: [Holidays]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Feriado eliminado
 */

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Verificar estado de salud del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor saludable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       500:
 *         description: Error en el servidor o base de datos
 */

/**
 * @openapi
 * /api/health/ready:
 *   get:
 *     summary: Verificar si el servidor está listo (Readiness Probe)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor listo
 */

/**
 * @openapi
 * /api/export/calendar-pdf:
 *   get:
 *     summary: Exportar calendario de turnos a PDF
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: cargo
 *         schema:
 *           type: string
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: viewMode
 *         schema:
 *           type: string
 *           enum: [month, week, day]
 *           default: month
 *     responses:
 *       200:
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @openapi
 * /api/export/report-pdf:
 *   get:
 *     summary: Exportar reporte detallado de asistencia a PDF
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: cargo
 *         schema:
 *           type: string
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @openapi
 * /api/export/shift-report-pdf/{id}:
 *   get:
 *     summary: Exportar bitácora de turno a PDF
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @openapi
 * /api/export/report-excel:
 *   get:
 *     summary: Exportar reporte de asistencia a Excel
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         required: true
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         required: true
 *       - in: query
 *         name: area
 *         schema: { type: string }
 *       - in: query
 *         name: employeeId
 *         schema: { type: string }
 *       - in: query
 *         name: mode
 *         schema: { type: string, enum: [summary, detailed] }
 *     responses:
 *       200:
 *         description: Archivo Excel
 */

/**
 * @openapi
 * /api/employees/kiosk:
 *   get:
 *     summary: Obtiene lista de empleados para modo Kiosko
 *     tags: [Employees]
 */

/**
 * @openapi
 * /api/employees:
 *   get:
 *     summary: Obtiene todos los empleados
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 */

/**
 * @openapi
 * /api/employees:
 *   post:
 *     summary: Crea un nuevo empleado
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Empleado creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 */

/**
 * @openapi
 * /api/employees/bulk:
 *   post:
 *     summary: Importación masiva de empleados
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Empleados creados exitosamente
 */

/**
 * @openapi
 * /api/employees/{id}:
 *   put:
 *     summary: Actualiza un empleado existente
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Empleado actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 */

/**
 * @openapi
 * /api/employees/export:
 *   get:
 *     summary: Exportar empleados en formato Excel/CSV
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Activo, Archivado]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @openapi
 * /api/corrections:
 *   get:
 *     summary: Obtener solicitudes de corrección
 *     tags: [Corrections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CorrectionRequestListResponse'
 */

/**
 * @openapi
 * /api/corrections:
 *   post:
 *     summary: Crear una nueva solicitud de corrección
 *     tags: [Corrections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorrectionRequest'
 *     responses:
 *       201:
 *         description: Solicitud creada
 */

/**
 * @openapi
 * /api/corrections/stats:
 *   get:
 *     summary: Obtener estadísticas de solicitudes de corrección
 *     tags: [Corrections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas agregadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */

/**
 * @openapi
 * /api/corrections/{id}/history:
 *   get:
 *     summary: Obtener historial de una solicitud de corrección
 *     tags: [Corrections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historial de la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 */

/**
 * @openapi
 * /api/corrections/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una solicitud de corrección
 *     tags: [Corrections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCorrectionStatus'
 *     responses:
 *       200:
 *         description: Estado actualizado
 */

/**
 * @openapi
 * /api/configs/public/company-policy:
 *   get:
 *     summary: Obtener la politica corporativa publica
 *     tags: [Configs]
 *     responses:
 *       200:
 *         description: Politica corporativa vigente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */

/**
 * @openapi
 * /api/configs/public/company-policy/file:
 *   get:
 *     summary: Descargar el PDF de la politica corporativa
 *     tags: [Configs]
 *     responses:
 *       200:
 *         description: Archivo PDF de la politica corporativa
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @openapi
 * /api/configs/company-policy:
 *   post:
 *     summary: Subcribir la politica corporativa en PDF
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Politica corporativa actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */

/**
 * @openapi
 * /api/configs/public/brand-logo:
 *   get:
 *     summary: Obtener el logo de marca configurado
 *     tags: [Configs]
 *     responses:
 *       200:
 *         description: Logo de marca vigente con fuente y tamaño
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */

/**
 * @openapi
 * /api/configs/public/brand-logo/file:
 *   get:
 *     summary: Descargar el archivo del logo de marca
 *     tags: [Configs]
 *     responses:
 *       200:
 *         description: Archivo de imagen del logo (PNG, JPG o WebP)
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @openapi
 * /api/configs/brand-logo:
 *   post:
 *     summary: Subir el logo de marca (PNG, JPG o WebP)
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo de marca actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */

/**
 * @openapi
 * /api/configs/server-time:
 *   get:
 *     summary: Obtener hora actual del servidor
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hora del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerTime'
 */

/**
 * @openapi
 * /api/configs/validate-closure:
 *   get:
 *     summary: Validar si una fecha puede cerrar el periodo contable
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Resultado de la validacion de cierre
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 */

/**
 * @openapi
 * /api/configs:
 *   get:
 *     summary: Listar configuraciones del sistema
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de configuraciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConfigEntry'
 */

/**
 * @openapi
 * /api/configs/{key}:
 *   get:
 *     summary: Obtener una configuración por llave
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entrada de configuración
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfigEntry'
 */

/**
 * @openapi
 * /api/configs/{key}:
 *   post:
 *     summary: Establecer una configuración por llave
 *     tags: [Config]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: any
 *     responses:
 *       200:
 *         description: Configuración guardada
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión de usuario (Soporta MFA)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Login'
 *     responses:
 *       200:
 *         description: Login exitoso o requerimiento de MFA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 token: { type: string }
 *                 requiresMFA: { type: boolean }
 *                 mustChangePassword: { type: boolean }
 *       401:
 *         description: Credenciales inválidas
 */

/**
 * @openapi
 * /api/auth/mfa/setup:
 *   post:
 *     summary: Genera secreto MFA y QR
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Secreto generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode: { type: string }
 *                 secret: { type: string }
 */

/**
 * @openapi
 * /api/auth/mfa/verify:
 *   post:
 *     summary: Habilita MFA tras verificar primer código
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: MFA habilitado
 */

/**
 * @openapi
 * /api/auth/mfa/validate:
 *   post:
 *     summary: Valida código MFA durante login
 *     tags: [Auth]
 *     responses:
 *       401:
 *         description: Código o desafío inválido, expirado o MFA deshabilitado
 *       403:
 *         description: Cuenta archivada entre factores
 *       429:
 *         description: Cinco códigos incorrectos bloquean MFA durante cinco minutos
 *         headers:
 *           Retry-After:
 *             description: Segundos hasta que se permita otro intento
 *             schema:
 *               type: integer
 *               minimum: 1
 *       200:
 *         description: Autenticación de dos pasos exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 mustChangePassword: { type: boolean }
 */

/**
 * @openapi
 * /api/auth/kiosk-login:
 *   post:
 *     summary: Inicia sesión modo Kiosko (Reloj Control)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/KioskLogin'
 *     responses:
 *       200:
 *         description: Login de Kiosko exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 employee: { $ref: '#/components/schemas/Employee' }
 */

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Cierra sesión del usuario
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */

/**
 * @openapi
 * /api/audit-logs/export:
 *   get:
 *     summary: Exportar logs de auditoría
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo de auditoría generado
 */

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     summary: Obtener logs de auditoría paginados
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: string
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de logs de auditoría
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditLogListResponse'
 */

/**
 * @openapi
 * /api/audit-logs:
 *   post:
 *     summary: Crear log de auditoría manual
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditLog'
 *     responses:
 *       201:
 *         description: Log creado
 */

/**
 * @openapi
 * /api/audit-logs/integrity-status:
 *   get:
 *     summary: Obtener estado de integridad de la auditoría
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reporte de integridad
 */

/**
 * @openapi
 * /api/audit-logs/verify-integrity:
 *   get:
 *     summary: Verificar integridad de la auditoría (Elevado)
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verificación iniciada
 */

/**
 * @openapi
 * /api/audit-logs/cleanup:
 *   post:
 *     summary: Limpiar logs de auditoría antiguos
 *     tags: [AuditLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Limpieza realizada
 */

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     summary: Obtener estadísticas del sistema
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del sistema
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SystemStats'
 */

/**
 * @openapi
 * /api/admin/diagnose-autoclose:
 *   get:
 *     summary: Diagnosticar cierre automático de turnos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reporte de diagnóstico
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: number }
 *                 anomalies: { type: array, items: { type: object } }
 */

/**
 * @openapi
 * /api/admin/trigger-autoclose:
 *   post:
 *     summary: Disparar cierre automático de turnos manualmente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cierre ejecutado
 */

/**
 * @openapi
 * /api/admin/trigger-accounting-autoclose:
 *   post:
 *     summary: Disparar cierre contable automático manualmente
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cierre contable ejecutado
 */

/**
 * @openapi
 * /api/admin/security-insights:
 *   get:
 *     summary: Obtener insights de seguridad
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Análisis de seguridad
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SecurityInsights'
 */

/**
 * @openapi
 * /api/admin/integrity-status:
 *   get:
 *     summary: Obtener estado de integridad de datos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado de integridad
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 status: { type: object }
 */

/**
 * @openapi
 * /api/admin/trigger-backup:
 *   post:
 *     summary: Disparar respaldo de base de datos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Respaldo iniciado
 */

/**
 * @openapi
 * /api/admin/purge-sessions:
 *   post:
 *     summary: Purgar sesiones de usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurgeSessions'
 *     responses:
 *       200:
 *         description: Sesiones purgadas
 */

/**
 * @openapi
 * /api/admin/reset-password:
 *   post:
 *     summary: Restablecer contraseña de usuario
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: Contraseña restablecida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

/**
 * @openapi
 * /api/admin/backups:
 *   get:
 *     summary: Obtener lista de respaldos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de archivos de respaldo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   filename: { type: string }
 *                   size: { type: number }
 *                   createdAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /api/admin/restore:
 *   post:
 *     summary: Restaurar base de datos desde backup
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename: { type: string }
 *     responses:
 *       200:
 *         description: Restauración exitosa
 *       500:
 *         description: Error crítico en restauración
 */

/**
 * @openapi
 * /api/admin/restart:
 *   post:
 *     summary: Reiniciar el proceso del backend
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reinicio solicitado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: No se pudo reiniciar el backend
 */

/**
 * @openapi
 * /api/email/verify:
 *   post:
 *     summary: Verificar configuración de correo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailVerify'
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración verificada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailOperationResult'
 */

/**
 * @openapi
 * /api/email/config:
 *   get:
 *     summary: Obtener configuración de correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración de correo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailConfig'
 */

/**
 * @openapi
 * /api/email/config:
 *   post:
 *     summary: Guardar configuración de correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailConfig'
 *     responses:
 *       200:
 *         description: Configuración guardada exitosamente
 */

/**
 * @openapi
 * /api/email/rules:
 *   get:
 *     summary: Obtener reglas de notificación por correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reglas de notificación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailRules'
 */

/**
 * @openapi
 * /api/email/rules:
 *   post:
 *     summary: Guardar reglas de notificación por correo
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRules'
 *     responses:
 *       200:
 *         description: Reglas guardadas exitosamente
 */

/**
 * @openapi
 * /api/email/send-test:
 *   post:
 *     summary: Enviar correo de prueba
 *     tags: [Email]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendTestEmail'
 *     responses:
 *       200:
 *         description: Correo de prueba enviado exitosamente
 */

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: Gestión de usuarios y permisos
 */

/**
 * @openapi
 * tags:
 *   name: Shifts
 *   description: Gestión de turnos, patrones y programación de personal
 */

/**
 * @openapi
 * tags:
 *   name: Holidays
 *   description: Gestión de feriados nacionales y regionales
 */

/**
 * @openapi
 * tags:
 *   name: Exports
 *   description: Endpoints para exportación de archivos PDF y Excel
 */
