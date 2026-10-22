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

  /** Rango de fechas invertido (el fin no es posterior al inicio). */
  invalidDateRange: (): string => "La fecha de término debe ser posterior a la fecha de inicio.",

  /** Valor duplicado en un campo único. */
  duplicate: (field: string): string => `${field} ya está registrado.`,

  /** Valor esperado numérico. */
  invalidNumber: (): string => "Ingrese un valor numérico válido.",

  /** Error de validación de formulario sin un mensaje más específico. */
  generic: (): string => "Revise los datos ingresados e intente nuevamente.",
} as const;

/** Tipo del catálogo de mensajes (útil para tipar helpers por clave). */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
