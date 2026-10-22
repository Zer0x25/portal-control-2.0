/**
 * Spec 036 T3 (AC2): mapa central de los mensajes de error en español.
 *
 * Antes de esta capa cada formulario de negocio escribía su propio texto y el
 * mismo error se expresaba de tres formas distintas según la pantalla:
 *
 * - `"Formato de email inválido."` (EmployeeForm) vs `"Por favor, corrija el
 *   formato del email."` (toast de EmployeeForm).
 * - `"RUT inválido. Verifique el dígito verificador."` vs `"RUT no es válido."`.
 * - `"La nueva contraseña debe tener al menos 6 caracteres."` repetido en dos
 *   controllers.
 *
 * Reglas del mapa:
 *
 * 1. Los mensajes son **de la UI**: viven en el frontend y están en español.
 * 2. El **backend es la autoridad** sobre las *reglas* (longitudes, enums,
 *    patrones). Este mapa unifica el *texto*, no redefine las reglas: cuando
 *    una longitud viene del backend se **parametriza** (`minLength`,
 *    `maxLength`, `passwordTooShort`) para que el texto no vuelva a quedar
 *    desincronizado del contrato.
 * 3. Todo mensaje nuevo debe entrar por aquí: si dos formularios necesitan la
 *    misma regla, tienen que **expresarla igual**.
 */

/** Catálogo de mensajes de error de los formularios de negocio. */
export const ERROR_MESSAGES = {
  /** Campo obligatorio: `"Nombre es obligatorio."` */
  required: (field: string): string => `${field} es obligatorio.`,

  /** Longitud mínima de un campo de texto. */
  minLength: (field: string, min: number): string =>
    `${field} debe tener al menos ${min} caracteres.`,

  /** Longitud máxima de un campo de texto. */
  maxLength: (field: string, max: number): string =>
    `${field} no puede superar los ${max} caracteres.`,

  /** Correo con formato inválido. */
  invalidEmail: (): string => "Formato de email inválido.",

  /**
   * RUT con dígito verificador incorrecto.
   *
   * Regla **exclusiva del cliente**: el backend solo exige `min(8)`
   * (`backend/src/models/schemas/employee.schemas.ts`), el frontend valida el
   * dígito verificador. Divergencia deliberada (spec 036 AC2).
   */
  invalidRut: (): string => "RUT inválido. Verifique el dígito verificador.",

  /** RUT ya registrado en el padrón. */
  duplicateRut: (): string => "Error: RUT ya Registrado.",

  /** RUT más corto que el mínimo del backend (`min(8)`). */
  rutTooShort: (): string => "RUT demasiado corto.",

  /** PIN de empleado: exactamente 4 dígitos numéricos. */
  invalidPin: (): string => "El PIN debe contener exactamente 4 dígitos numéricos",

  /** Contraseña más corta que el mínimo del backend (`min(6)`). */
  passwordTooShort: (min = 6): string =>
    `La nueva contraseña debe tener al menos ${min} caracteres.`,

  /** Las dos contraseñas no coinciden. */
  passwordMismatch: (): string => "Las nuevas contraseñas no coinciden.",

  /** Hora fuera de la jornada laboral. */
  timeOutOfRange: (min: string, max: string): string => `La hora debe estar entre ${min} y ${max}.`,

  /** Fecha con un formato distinto de `YYYY-MM-DD`. */
  invalidDate: (): string => "Formato de fecha inválido (YYYY-MM-DD)",

  /** Hora con un formato distinto de `HH:mm` (24 horas). */
  invalidTime: (): string => "Formato de hora inválido (HH:mm)",

  /** Patente vehicular que no sigue el formato de la pantalla (`AA-BB-11`). */
  invalidLicensePlate: (): string => "La patente vehicular no tiene un formato válido (AA-BB-11).",

  /** Número de pasajeros que no es un entero no negativo. */
  invalidPaxCount: (): string => "El número de pasajeros debe ser un entero mayor o igual a 0.",

  /** Rango de fechas invertido (el fin no es posterior al inicio). */
  invalidDateRange: (): string => "La fecha de término debe ser posterior a la fecha de inicio.",

  /** Fecha de término anterior al día de hoy (edición de un registro). */
  endDateInPast: (): string => "La fecha de término no puede ser anterior al día de hoy.",

  /** Valor duplicado en un campo único. */
  duplicate: (field: string): string => `${field} ya está registrado.`,

  /**
   * Nombre duplicado (patrones de turno).
   *
   * @param name nombre que choca con uno ya guardado.
   */
  duplicateName: (name: string): string => `El nombre "${name}" ya existe.`,

  /**
   * Regla de un día del ciclo de un patrón de turno.
   *
   * @param day número de día del ciclo (1 = primer día).
   * @param rule descripción de la regla incumplida.
   */
  shiftDayRule: (day: number, rule: string): string => `Día ${day}: ${rule}`,

  /**
   * Horas del patrón por encima del máximo legal configurado.
   *
   * @param hours horas semanales del patrón.
   * @param max máximo legal configurado.
   */
  maxWeeklyHoursExceeded: (hours: number, max: number): string =>
    `Las horas del patrón (${hours}) no pueden superar el máximo legal de ${max} horas.`,

  /** Ausencia o asignación con más de 7 días de antigüedad. */
  tooOldRecord: (): string => "No se pueden registrar con más de 7 días de antigüedad.",

  /** El empleado ya tiene una ausencia en el período indicado. */
  overlappingLeave: (): string => "El empleado ya tiene una ausencia en este período.",

  /** Ya existe un feriado en la fecha indicada. */
  duplicateHolidayDate: (): string => "Ya existe un feriado en esta fecha.",

  /** Patrón mensual: la fecha de inicio debe ser el día 1 del mes. */
  monthlyPatternStartDate: (): string =>
    "Para patrones mensuales (28-31 días), la fecha de inicio debe ser el día 1 del mes.",

  /** Patrón mensual: hace falta la fecha de término. */
  monthlyPatternEndDate: (): string =>
    "Para patrones mensuales (28-31 días), se requiere una fecha de término.",

  /** Valor esperado numérico. */
  invalidNumber: (): string => "Ingrese un valor numérico válido.",

  /** Lectura de medidor: el texto escrito no es un número. */
  invalidMeterValue: (): string => "El valor ingresado no es un número válido.",

  /** Lectura de medidor: el valor no puede estar vacío. */
  emptyMeterValue: (): string => "El valor no puede estar vacío.",

  /** Lectura de medidor: una lectura (sin recargar) no puede ser negativa. */
  negativeMeterValue: (): string => "El valor no puede ser negativo.",

  /** Lectura de medidor: el porcentaje no puede pasar de 100. */
  meterPercentAboveHundred: (): string => "El porcentaje no puede ser mayor a 100.",

  /** Lectura de medidor: el valor no puede pasar la capacidad del medidor. */
  meterValueAboveCapacity: (value: number, capacity: number): string =>
    `El valor (${value}) no puede superar la capacidad máxima (${capacity}).`,

  /** Lectura de medidor: un medidor de consumo no puede bajar. */
  meterValueBelowPrevious: (value: number, previous: number): string =>
    `El nuevo valor (${value}) no puede ser menor al anterior (${previous.toFixed(2)}).`,

  /** Error de validación de formulario sin un mensaje más específico. */
  generic: (): string => "Revise los datos ingresados e intente nuevamente.",
} as const;

/** Tipo del catálogo de mensajes (útil para tipar helpers por clave). */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
