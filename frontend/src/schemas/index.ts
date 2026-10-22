import { z } from "zod";

import type { components } from "../types/api-schema";

import {
  adminResetPasswordFormSchema,
  buildMfaSetupFormSchema,
  changePasswordFormSchema,
  forceChangePasswordFormSchema,
  loginFormSchema,
  mfaLoginFormSchema,
  mfaSetupFormSchema,
  mfaValidateFormSchema,
} from "./forms/auth";
import {
  correctionRequestFormSchema,
  correctionStatusFormSchema,
  rejectionReasonFormSchema,
} from "./forms/correction";
import { employeeFormFieldsSchema, employeeFormSchema } from "./forms/employee";
import { holidayFormSchema } from "./forms/holiday";
import { leaveFormSchema } from "./forms/leave";
import {
  meterReadingFormSchema,
  meterReadingsBaseSchema,
  singleMeterReadingBaseSchema,
} from "./forms/meter";
import { quickNoteFormSchema } from "./forms/note";
import {
  seedOptionsFormSchema,
  seedPhase2FormSchema,
  seedingOptionsFormSchema,
} from "./forms/seed";
import { shiftAssignmentFormSchema, shiftPatternFormSchema } from "./forms/shift";
import {
  buildSmtpProfileFormSchema,
  emailRuleFormSchema,
  emailRulesFormSchema,
  sendTestEmailFormSchema,
  smtpConfigFormSchema,
  smtpProfileFormSchema,
  smtpVerifyFormSchema,
} from "./forms/smtp";
import { timeRecordWriteFormSchema } from "./forms/timestamp";
import { buildUserFormSchema, userCreateFormSchema, userUpdateFormSchema } from "./forms/user";

export * from "./forms";

/**
 * Spec 036 T5/T7 (AC2): **mapa de contratos** entre los schemas de formulario
 * del frontend y los schemas OpenAPI del backend.
 *
 * Cada entrada declara:
 *
 * - `id`: identificador estable del schema de formulario;
 * - `openApi`: nombre del schema del backend del que es **copia** (`null`
 *   cuando el formulario es local y no muta el backend);
 * - `schema`: el schema Zod;
 * - `forms`: los componentes de UI que lo consumen;
 * - `divergences`: las reglas **del cliente** que el backend no implementa
 *   (declaradas, no ocultas: el test de paridad las conoce).
 *
 * El test `src/tests/contracts/form-schema-parity.test.ts` recorre este mapa
 * y compara, atributo a atributo, el JSON Schema que genera Zod con el
 * artefacto OpenAPI del backend (`backend/docs/swagger.json`).
 */
export interface FormSchemaContract {
  /** Identificador estable del schema de formulario. */
  readonly id: string;
  /** Schema OpenAPI del backend del que es copia (`null` si es local). */
  readonly openApi: string | null;
  /**
   * Ruta dentro del schema OpenAPI donde vive el equivalente del formulario
   * (`"profiles.items"` para el perfil SMTP, que es un item del array).
   */
  readonly openApiPath?: string;
  /** Schema Zod del formulario. */
  readonly schema: z.ZodType;
  /** Componentes de UI que consumen el schema. */
  readonly forms: readonly string[];
  /** Campos que solo existen en el formulario (nunca viajan al backend). */
  readonly localFields?: readonly string[];
  /**
   * Campos que el formulario escribe y que el backend **acepta y guarda**,
   * pero que su schema OpenAPI **no declara**.
   *
   * No son campos locales (si viajan) ni una perdida silenciosa (el backend
   * los persiste): son un **hueco de documentacion** del contrato, que se
   * declara para que el test de paridad no lo confunda con un error.
   */
  readonly openApiUndeclaredFields?: readonly string[];
  /** Campos cuyo valor se transforma antes de enviarlo. */
  readonly transformedFields?: readonly string[];
  /** Campos que el formulario exige aunque el backend los admita opcionales. */
  readonly stricterRequired?: readonly string[];
  /**
   * Campos cuyo **maximo** el formulario estrecha mas que el backend.
   *
   * Son los limites de la pantalla (el maximo de empleados que se pueden
   * sembrar, por ejemplo): el backend no los acota, asi que el comparador de
   * paridad no puede exigir que coincidan. El minimo del backend si se
   * sigue comparando.
   */
  readonly stricterMaximum?: readonly string[];
  /** Reglas del cliente que el backend no implementa. */
  readonly divergences?: readonly string[];
}

/** Mapa de contratos de los schemas de formulario. */
export const FORM_SCHEMA_CONTRACTS: readonly FormSchemaContract[] = [
  {
    id: "employeeForm",
    openApi: "Employee",
    schema: employeeFormFieldsSchema,
    forms: ["EmployeeForm", "ImportModal"],
    openApiUndeclaredFields: ["area", "workdayType"],
    stricterRequired: ["position"],
    divergences: [
      "rut: digito verificador (regla exclusiva del cliente)",
      "position: el formulario lo exige; el backend lo admite opcional",
      "area/workdayType: el backend los acepta y los guarda, pero su schema OpenAPI no los declara",
    ],
  },
  {
    id: "userCreateForm",
    openApi: "CreateUser",
    schema: userCreateFormSchema,
    // Copia del contrato del backend: la usa el formulario a traves del schema
    // unico de la pantalla (`userForm`), que reune las reglas del alta y la
    // edicion.
    forms: [],
  },
  {
    id: "userUpdateForm",
    openApi: "UpdateUser",
    schema: userUpdateFormSchema,
    forms: [],
  },
  {
    id: "userForm",
    openApi: "UpdateUser",
    schema: buildUserFormSchema({ isEditing: true }),
    forms: ["UserForm"],
    stricterRequired: ["username", "role"],
    divergences: [
      "password: en el alta el formulario exige la contraseña (6 caracteres), como hace CreateUser",
    ],
  },
  {
    id: "loginForm",
    openApi: "Login",
    schema: loginFormSchema,
    forms: ["LoginPage"],
  },
  {
    id: "mfaCodeForm",
    openApi: "MFAValidate",
    schema: mfaLoginFormSchema,
    forms: ["MFALoginModal"],
    divergences: ["mfaToken: lo aporta la sesion (el modal solo escribe el codigo de 6 digitos)"],
  },
  {
    id: "mfaValidateForm",
    openApi: "MFAValidate",
    schema: mfaValidateFormSchema,
    // Copia del contrato del backend: el formulario de inicio de sesion usa
    // el subconjunto `mfaCodeForm` (solo escribe el codigo).
    forms: [],
  },
  {
    id: "mfaSetupForm",
    openApi: "MFAVerify",
    schema: buildMfaSetupFormSchema(),
    forms: ["MFASetupModal"],
    divergences: [
      "token: el formulario exige 6 digitos numericos (el backend acepta 1+ caracteres; el TOTP lo valida el servidor)",
    ],
  },
  {
    id: "changePasswordForm",
    openApi: "UpdateUser",
    schema: changePasswordFormSchema,
    forms: ["ChangePasswordModal", "ForceChangePasswordModal"],
    localFields: ["passwordConfirm"],
    stricterRequired: ["password"],
    divergences: [
      "passwordConfirm: confirmacion local, no viaja al backend",
      "password: el formulario de cambio de contraseña lo exige (el backend lo admite opcional)",
    ],
  },
  {
    id: "forceChangePasswordForm",
    openApi: "UpdateUser",
    schema: forceChangePasswordFormSchema,
    forms: ["ForceChangePasswordModal"],
    localFields: ["passwordConfirm"],
    stricterRequired: ["password"],
    divergences: [
      "passwordConfirm: confirmacion local, no viaja al backend",
      "password: el formulario de cambio de contraseña lo exige (el backend lo admite opcional)",
    ],
  },
  {
    id: "adminResetPasswordForm",
    openApi: "ResetPassword",
    schema: adminResetPasswordFormSchema,
    forms: ["SystemMaintenance"],
  },
  {
    id: "leaveForm",
    openApi: "LeaveRecord",
    schema: leaveFormSchema,
    forms: ["LeaveManager"],
  },
  {
    id: "holidayForm",
    openApi: "Holiday",
    schema: holidayFormSchema,
    forms: ["HolidayManager"],
  },
  {
    id: "shiftPatternForm",
    openApi: "ShiftPattern",
    schema: shiftPatternFormSchema,
    forms: ["PatternManager"],
    divergences: ["dailySchedules: el frontend envia el array, no el string serializado"],
  },
  {
    id: "shiftAssignmentForm",
    openApi: "AssignedShift",
    schema: shiftAssignmentFormSchema,
    forms: ["AssignmentManager"],
  },
  {
    id: "quickNoteForm",
    openApi: "QuickNote",
    schema: quickNoteFormSchema,
    forms: ["QuickNotes"],
    divergences: ["authorUsername: lo deduce el servidor de la sesion"],
  },
  {
    id: "correctionRequestForm",
    openApi: "CorrectionRequest",
    schema: correctionRequestFormSchema,
    forms: ["CorrectionRequestModal"],
    transformedFields: ["requestedValue"],
    divergences: [
      "requestedValue: el formulario captura `YYYY-MM-DDTHH:mm` (hora de Chile) y el controller lo convierte a ISO-8601 con offset antes de enviarlo",
    ],
  },
  {
    id: "correctionStatusForm",
    openApi: "UpdateCorrectionStatus",
    schema: correctionStatusFormSchema,
    // Copia del contrato del backend: el modal de rechazo usa el subconjunto
    // `rejectionReasonForm` (solo escribe el motivo).
    forms: [],
  },
  {
    id: "rejectionReasonForm",
    openApi: "UpdateCorrectionStatus",
    schema: rejectionReasonFormSchema,
    forms: ["RejectionReasonModal"],
    stricterRequired: ["rejectionReason"],
    divergences: [
      "rejectionReason: el backend lo exige solo cuando el estado es `rejected`; este formulario siempre rechaza",
      "el modal solo escribe el motivo: el estado y el supervisor que resuelve los pone la pantalla",
    ],
  },
  {
    id: "meterReadingForm",
    openApi: "MeterReading",
    schema: meterReadingFormSchema,
    forms: [],
    divergences: ["authorUsername: lo deduce el servidor de la sesion"],
  },
  {
    id: "singleMeterReadingForm",
    openApi: "MeterReading",
    schema: singleMeterReadingBaseSchema,
    forms: ["SingleMeterInputModal"],
    transformedFields: ["value"],
    divergences: [
      "value: el formulario escribe el texto que teclea el usuario; el hook `useMeterReadings` lo convierte a numero antes de enviarlo",
      "authorUsername: lo deduce el servidor de la sesion",
    ],
  },
  {
    id: "meterReadingsForm",
    openApi: "BulkMeterReading",
    schema: meterReadingsBaseSchema,
    forms: ["MeterForm", "MetersModal"],
    transformedFields: ["value"],
    divergences: [
      "value: una entrada por medidor (un `record` dinamico); cada valor es el texto que teclea el usuario y el hook lo convierte a numero",
    ],
  },
  {
    id: "smtpProfileForm",
    openApi: "EmailConfig",
    openApiPath: "profiles.items",
    schema: buildSmtpProfileFormSchema(),
    forms: ["SmtpConfigModal"],
    divergences: [
      "host/user/pass/fromName/fromEmail: el formulario los exige con contenido (el backend admite la cadena vacia)",
    ],
  },
  {
    id: "smtpProfileBaseForm",
    openApi: "EmailConfig",
    openApiPath: "profiles.items",
    schema: smtpProfileFormSchema,
    // Copia del contrato del backend: es la que fija las reglas que OpenAPI
    // no expresa (el remitente puede ir vacio si el perfil no es el activo).
    forms: [],
    divergences: [
      "fromEmail: el backend admite el remitente vacio mientras el perfil no sea el activo",
    ],
  },
  {
    id: "smtpConfigForm",
    openApi: "EmailConfig",
    schema: smtpConfigFormSchema,
    // Copia del contrato del backend: el modal valida el perfil que se esta
    // editando (`smtpProfileForm`) y arma el payload completo con los tres.
    forms: [],
  },
  {
    id: "smtpVerifyForm",
    openApi: "EmailVerify",
    schema: smtpVerifyFormSchema,
    forms: ["SmtpConfigModal"],
  },
  {
    id: "emailRulesForm",
    openApi: "EmailRules",
    schema: emailRulesFormSchema,
    forms: ["SystemMaintenance"],
  },
  {
    id: "emailRuleForm",
    openApi: "EmailRules",
    openApiPath: "autoCloseShift",
    schema: emailRuleFormSchema,
    forms: ["SystemMaintenance"],
    divergences: ["recipient: una regla activa exige destinatario (regla condicional)"],
  },
  {
    id: "sendTestEmailForm",
    openApi: "SendTestEmail",
    schema: sendTestEmailFormSchema,
    forms: ["EmailCenter"],
    stricterRequired: ["subject", "message"],
    divergences: [
      "subject/message: el backend los admite vacios (los pone por defecto); el formulario los exige",
    ],
  },
  {
    id: "seedOptionsForm",
    openApi: "SeedOptions",
    schema: seedOptionsFormSchema,
    // Copia del contrato del backend: la pantalla usa el subconjunto
    // `seedingOptionsForm` (los siete numeros que muestra).
    forms: [],
  },
  {
    id: "seedingOptionsForm",
    openApi: "SeedOptions",
    schema: seedingOptionsFormSchema,
    forms: ["SeedingOptionsModal"],
    stricterRequired: [
      "employees",
      "days",
      "basePatternsCount",
      "leaveRatio",
      "correctionRequestRatio",
      "shiftReportsPerDay",
      "quickNotesCount",
    ],
    stricterMaximum: ["employees", "days", "basePatternsCount", "quickNotesCount"],
    divergences: [
      "el formulario siempre envia los siete valores; el backend los admite opcionales y aplica sus propios valores por defecto",
      "employees/days: el formulario exige al menos 1 (el backend admite 0)",
      "employees/days/basePatternsCount/quickNotesCount: el maximo es el limite de la pantalla (el backend no los acota)",
    ],
  },
  {
    id: "seedPhase2Form",
    openApi: "SeedPhase2Start",
    schema: seedPhase2FormSchema,
    forms: ["SeedingProgressModal"],
  },
  {
    id: "timeRecordWriteForm",
    openApi: "TimeRecordWrite",
    schema: timeRecordWriteFormSchema,
    forms: ["EditTimestampModal", "useTimestampEditor"],
  },
];

/**
 * Formularios **locales**: no mutan el backend, asi que no tienen schema
 * OpenAPI con el que verificar la paridad.
 */
export const LOCAL_ONLY_FORM_SCHEMA_IDS = [
  "localSupplierForm",
  "localNoveltyForm",
  "localMeterConfigForm",
] as const;

/* -------------------------------------------------------------------------- */
/* Contrato de tipos (spec 036 T5)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Comprueba **en tiempo de compilacion** que el payload de un formulario es
 * asignable al contrato OpenAPI generado (`src/types/api-schema.ts`).
 *
 * Es la segunda mitad de la paridad: el test de runtime compara las
 * *restricciones* (`required`, `minLength`, `pattern`...), y estas
 * aserciones comparan los *tipos*. Si el backend cambia un tipo (un campo que
 * pasa de `string` a `string | null`), el frontend no compila hasta que el
 * schema del formulario se actualiza.
 *
 * No se duplica el contrato: se reutiliza el generado.
 */
type AssertAssignable<TForm extends TContract, TContract> = TForm;

/** Payload del formulario de empleado: debe encajar en `Employee`. */
export type EmployeePayloadContract = AssertAssignable<
  z.output<typeof employeeFormSchema>,
  components["schemas"]["Employee"]
>;

/**
 * Payload del formulario de empleado (el que usa el formulario de la spec 036
 * T9): los campos que el backend acepta y su OpenAPI no declara quedan fuera
 * de la comparacion.
 */
export type EmployeeFormPayloadContract = AssertAssignable<
  Omit<z.output<typeof employeeFormFieldsSchema>, "area" | "workdayType">,
  components["schemas"]["Employee"]
>;

/** Payload del alta de usuario: debe encajar en `CreateUser`. */
export type UserCreatePayloadContract = AssertAssignable<
  z.output<typeof userCreateFormSchema>,
  components["schemas"]["CreateUser"]
>;

/** Payload de la edicion de usuario: debe encajar en `UpdateUser`. */
export type UserUpdatePayloadContract = AssertAssignable<
  z.output<typeof userUpdateFormSchema>,
  components["schemas"]["UpdateUser"]
>;

/** Payload del inicio de sesion: debe encajar en `Login`. */
export type LoginPayloadContract = AssertAssignable<
  z.output<typeof loginFormSchema>,
  components["schemas"]["Login"]
>;

/**
 * Payload del codigo MFA (copia del contrato): debe encajar en `MFAValidate`.
 */
export type MfaValidatePayloadContract = AssertAssignable<
  z.output<typeof mfaValidateFormSchema>,
  components["schemas"]["MFAValidate"]
>;

/**
 * Payload del codigo MFA del formulario (solo escribe el codigo): el token lo
 * aporta la sesion, asi que la comparacion se hace sin `mfaToken`.
 */
export type MfaLoginPayloadContract = AssertAssignable<
  z.output<typeof mfaLoginFormSchema>,
  Omit<components["schemas"]["MFAValidate"], "mfaToken">
>;

/** Payload del alta de MFA: debe encajar en `MFAVerify`. */
export type MfaSetupPayloadContract = AssertAssignable<
  z.output<typeof mfaSetupFormSchema>,
  components["schemas"]["MFAVerify"]
>;

/** Payload del reseteo de contrasena: debe encajar en `ResetPassword`. */
export type AdminResetPasswordPayloadContract = AssertAssignable<
  z.output<typeof adminResetPasswordFormSchema>,
  components["schemas"]["ResetPassword"]
>;

/**
 * Payload del cambio de contrasena: debe encajar en `UpdateUser` una vez
 * quitado el campo local `passwordConfirm` (nunca viaja al backend).
 */
export type ChangePasswordPayloadContract = AssertAssignable<
  Omit<z.output<typeof changePasswordFormSchema>, "passwordConfirm">,
  components["schemas"]["UpdateUser"]
>;

/** Payload del cambio de contrasena forzado: debe encajar en `UpdateUser`. */
export type ForceChangePasswordPayloadContract = AssertAssignable<
  Omit<z.output<typeof forceChangePasswordFormSchema>, "passwordConfirm">,
  components["schemas"]["UpdateUser"]
>;

/** Payload de la ausencia: debe encajar en `LeaveRecord`. */
export type LeavePayloadContract = AssertAssignable<
  z.output<typeof leaveFormSchema>,
  components["schemas"]["LeaveRecord"]
>;

/** Payload del feriado: debe encajar en `Holiday`. */
export type HolidayPayloadContract = AssertAssignable<
  z.output<typeof holidayFormSchema>,
  components["schemas"]["Holiday"]
>;

/** Payload del patron de turno: debe encajar en `ShiftPattern`. */
export type ShiftPatternPayloadContract = AssertAssignable<
  z.output<typeof shiftPatternFormSchema>,
  components["schemas"]["ShiftPattern"]
>;

/** Payload de la asignacion de turno: debe encajar en `AssignedShift`. */
export type ShiftAssignmentPayloadContract = AssertAssignable<
  z.output<typeof shiftAssignmentFormSchema>,
  components["schemas"]["AssignedShift"]
>;

/**
 * Payload de la nota rapida: debe encajar en `QuickNote` sin
 * `authorUsername` (lo deduce el servidor de la sesion).
 */
export type QuickNotePayloadContract = AssertAssignable<
  z.output<typeof quickNoteFormSchema>,
  Omit<components["schemas"]["QuickNote"], "authorUsername">
>;

/** Payload de la solicitud de correccion: debe encajar en `CorrectionRequest`. */
export type CorrectionRequestPayloadContract = AssertAssignable<
  z.output<typeof correctionRequestFormSchema>,
  components["schemas"]["CorrectionRequest"]
>;

/** Payload de la resolucion de correccion: debe encajar en `UpdateCorrectionStatus`. */
export type CorrectionStatusPayloadContract = AssertAssignable<
  z.output<typeof correctionStatusFormSchema>,
  components["schemas"]["UpdateCorrectionStatus"]
>;

/**
 * Payload de la lectura de medidor: debe encajar en `MeterReading` sin
 * `authorUsername` (lo deduce el servidor de la sesion).
 */
export type MeterReadingPayloadContract = AssertAssignable<
  z.output<typeof meterReadingFormSchema>,
  Omit<components["schemas"]["MeterReading"], "authorUsername">
>;

/** Payload del perfil SMTP: debe encajar en un perfil de `EmailConfig`. */
export type SmtpProfilePayloadContract = AssertAssignable<
  z.output<typeof smtpProfileFormSchema>,
  components["schemas"]["EmailConfig"]["profiles"][number]
>;

/** Payload de la configuracion SMTP: debe encajar en `EmailConfig`. */
export type SmtpConfigPayloadContract = AssertAssignable<
  z.output<typeof smtpConfigFormSchema>,
  components["schemas"]["EmailConfig"]
>;

/** Payload de las reglas de correo: debe encajar en `EmailRules`. */
export type EmailRulesPayloadContract = AssertAssignable<
  z.output<typeof emailRulesFormSchema>,
  components["schemas"]["EmailRules"]
>;

/** Payload del correo de prueba: debe encajar en `SendTestEmail`. */
export type SendTestEmailPayloadContract = AssertAssignable<
  z.output<typeof sendTestEmailFormSchema>,
  components["schemas"]["SendTestEmail"]
>;

/** Payload de las opciones de siembra: debe encajar en `SeedOptions`. */
export type SeedOptionsPayloadContract = AssertAssignable<
  z.output<typeof seedOptionsFormSchema>,
  components["schemas"]["SeedOptions"]
>;

/** Payload de la edicion de marcaje: debe encajar en `TimeRecordWrite`. */
export type TimeRecordWritePayloadContract = AssertAssignable<
  z.output<typeof timeRecordWriteFormSchema>,
  components["schemas"]["TimeRecordWrite"]
>;
