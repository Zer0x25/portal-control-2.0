import { useCallback, useId, useMemo, useRef } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import type { ReactFormExtendedApi, StandardSchemaV1 } from "@tanstack/react-form";
import { logger } from "../utils/logger";

/**
 * Spec 036 T2 (AC1, AC3, AC4): la capa de formulario del producto.
 *
 * Antes de esta capa, 34 ficheros de `frontend/src/` reimplementaban la
 * máquina de formulario (`values` + `errors` + `handleChange` + `handleSubmit`
 * + `isSubmitting`) a mano. Este hook es el **único** sitio donde se decide:
 *
 * - **cómo se valida** (un schema Zod v4 pasado por Standard Schema, sin
 *   adaptadores externos: `@tanstack/react-form` v1 consume Standard Schema y
 *   `zod ^4.6.5` es Standard Schema nativo);
 * - **cuándo se ve el error** (nada hasta el primer intento de envío; a
 *   partir de ahí el error se recalcula en vivo mientras el usuario escribe);
 * - **cómo se bloquea el doble envío** (un **ref sincrónico**, la única
 *   barrera que sobrevive a dos clics en el mismo tick — invariante 5 de
 *   `.agents/rules/frontend-performance.md`);
 * - **cómo se normaliza el payload** (trim de cadenas y `""` → `null` en los
 *   campos declarados opcionales, **antes** de enviar);
 * - **a dónde va el foco** cuando el envío falla (primer control inválido en
 *   orden de lectura).
 *
 * Frontera de capas (spec 033 AC1): el hook se instancia en el **hook de
 * dominio o controller** (`features/<dominio>/hooks/use*Controller.ts`) o en
 * el `.container.tsx`. Un `.view.tsx` **no** lo importa: recibe `values`,
 * `errors` y los handlers por props.
 */

/** Errores por campo: la clave es el nombre del campo y el valor el mensaje. */
export type AppFormErrors = Record<string, string>;

/**
 * Clave con la que el estado de TanStack Form guarda el error de formulario
 * (los issues de un `superRefine` que no apuntan a ningun campo).
 */
const FORM_LEVEL_ERROR_KEY = "";

/** Ref sincrónico que bloquea un segundo envío mientras hay uno en vuelo. */
export type SubmitGuard = { current: boolean };

/** Enlace de un campo del formulario, listo para connectarlo a una primitiva. */
export interface AppFormFieldBinding<TValue> {
  /** Nombre del campo (clave del schema). */
  readonly name: string;
  /** Valor actual. */
  readonly value: TValue;
  /** Mensaje de error del campo (si lo tiene). */
  readonly error?: string;
  /** Escribe el valor del campo. */
  readonly onChange: (value: TValue) => void;
  /** Marca el campo como tocado (al salir de él). */
  readonly onBlur: () => void;
  /** El campo ya fue tocado por el usuario. */
  readonly isTouched: boolean;
  /** El campo cambió respecto del valor inicial. */
  readonly isDirty: boolean;
}

/** Opciones de `useAppForm`. */
export interface UseAppFormOptions<TValues extends object, TPayload = TValues> {
  /** Schema Zod v4 de **entrada de usuario** (Standard Schema nativo). */
  readonly schema: StandardSchemaV1<TValues, unknown>;
  /** Valores iniciales del formulario. */
  readonly defaultValues: TValues;
  /**
   * Callback de envío: recibe el payload (los valores ya normalizados y, si
   * hay `serialize`, ya serializados).
   */
  readonly onSubmit: (values: TPayload) => void | Promise<void>;
  /** Callback cuando el envío no pasa la validación. */
  readonly onInvalid?: (errors: AppFormErrors) => void;
  /**
   * Normalización del payload antes de enviarlo.
   *
   * Por defecto: `trim` de las cadenas, `""` → `undefined` (el campo se
   * omite del payload) y `""` → `null` en los campos listados en
   * `nullableFields`. Un formulario puede desactivarla pasando
   * `normalize: (values) => values` si su payload debe ser byte a byte el de
   * siempre.
   *
   * La normalización se aplica **antes de validar**, de modo que el schema
   * de formulario puede ser una copia exacta del schema del backend.
   */
  readonly normalize?: (values: TValues) => TValues;
  /**
   * Serializacion del payload final (despues de validar).
   *
   * Algunos formularios tienen campos **derivados** que viven en el estado
   * pero no viajan al backend (las horas calculadas de cada dia de un patron
   * de turno, por ejemplo). `normalize` no sirve para eso: se aplica **antes**
   * de validar y se escribe en el formulario, asi que borraria el valor
   * derivado de la pantalla.
   *
   * `serialize` actua **despues** de validar y **solo** sobre el payload: el
   * estado del formulario no cambia, la pantalla sigue mostrando el campo
   * derivado y el backend recibe el payload de siempre (spec 036 T13).
   *
   * El payload puede tener un **tipo propio** (`TPayload`): un formulario que
   * muestra mas campos de los que viaja puede tipar el payload aparte, sin
   * repartir casts por todo el hook.
   */
  readonly serialize?: (values: TValues) => TPayload;
  /** Campos cuyo `""` se envía como `null` (los que el backend admite como null). */
  readonly nullableFields?: readonly string[];
  /** Identificador del formulario (para el foco y el `data-testid`). */
  readonly formId?: string;
}

/** Resultado de `useAppForm`. */
export interface UseAppFormResult<TValues extends object> {
  /** API de TanStack Form (escape hatch para casos que el hook no cubre). */
  readonly form: AppFormApi<TValues>;
  /** Valores actuales del formulario. */
  readonly values: TValues;
  /** Errores por campo (solo visibles tras el primer intento de envío). */
  readonly errors: AppFormErrors;
  /** Error de formulario (reglas que no pertenecen a un campo concreto). */
  readonly formError?: string;
  /** Mensaje de error de un campo (o `undefined`). */
  readonly getError: (field: string) => string | undefined;
  /** Enlace de un campo: valor, error y handlers. */
  readonly field: <K extends keyof TValues & string>(name: K) => AppFormFieldBinding<TValues[K]>;
  /** Escribe el valor de un campo. */
  readonly setValue: <K extends keyof TValues & string>(name: K, value: TValues[K]) => void;
  /** Hay un envío en vuelo. */
  readonly isSubmitting: boolean;
  /** El formulario no tiene errores de validación. */
  readonly isValid: boolean;
  /** Algún campo cambió respecto de los valores iniciales. */
  readonly isDirty: boolean;
  /** Intentos de envío (0 = todavía no se envió). */
  readonly submissionAttempts: number;
  /** Envía el formulario (protegido contra el doble envío). */
  readonly submit: () => void;
  /** Ref sincrónico anti-doble-submit (invariante 5 de performance). */
  readonly submitGuard: SubmitGuard;
  /** Mueve el foco al primer control inválido del formulario. */
  readonly focusFirstInvalidField: () => void;
  /** Props para el `<form>`: `id`, `noValidate` y el `onSubmit` del hook. */
  readonly formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
  /** Reinicia el formulario a los valores iniciales (o a los que se indiquen). */
  readonly reset: (values?: TValues) => void;
}

/** API de TanStack Form con los validadores de esta capa. */
export type AppFormApi<TValues extends object> = ReactFormExtendedApi<
  TValues,
  undefined,
  StandardSchemaV1<TValues, unknown>,
  undefined,
  undefined,
  undefined,
  StandardSchemaV1<TValues, unknown>,
  undefined,
  undefined,
  undefined,
  undefined,
  never
>;

/**
 * Ejecuta `task` **una sola vez** mientras hay un intento en vuelo.
 *
 * El `disabled` del botón no basta: dos clics en el mismo tick disparan dos
 * POST antes de que React re-renderice. El ref es la única barrera sincrónica
 * (invariante 5 de `.agents/rules/frontend-performance.md`).
 *
 * @returns el resultado de `task`, o `undefined` si ya había un envío en vuelo.
 */
export async function withSubmitGuard<TResult>(
  guard: SubmitGuard,
  task: () => TResult | Promise<TResult>,
): Promise<TResult | undefined> {
  if (guard.current) return undefined;
  guard.current = true;
  try {
    return await task();
  } finally {
    guard.current = false;
  }
}

/**
 * Extrae el primer mensaje legible de un error de TanStack Form.
 *
 * La librería devuelve, según el origen del error, un `string`, un
 * `{ message }` (Standard Schema) o un array de cualquiera de los dos.
 */
export const toErrorMessage = (error: unknown): string | undefined => {
  if (error === null || error === undefined) return undefined;
  if (typeof error === "string") return error.length > 0 ? error : undefined;
  if (Array.isArray(error)) {
    for (const item of error) {
      const message = toErrorMessage(item);
      if (message) return message;
    }
    return undefined;
  }
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return undefined;
};

/**
 * Normalización por defecto del payload: `trim` de cadenas y `""` → `null`
 * en los campos declarados como `nullable`.
 *
 * Una cadena vacia **no aporta informacion**: se omite del payload
 * (`undefined` -> `JSON.stringify` no la escribe), de modo que el payload
 * sigue siendo identico al que se enviaba antes de la migracion (spec 036
 * T13). Los campos que el backend espera como `null` se convierten
 * explicitamente.
 */
export const normalizeFormValues = <TValues extends object>(
  values: TValues,
  nullableFields: readonly string[] = [],
): TValues => {
  const nullable = new Set(nullableFields);
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") {
        normalized[key] = trimmed;
        continue;
      }
      normalized[key] = nullable.has(key) ? null : undefined;
      continue;
    }
    normalized[key] = value;
  }

  return normalized as TValues;
};

/** Ejecuta `fn` después del pintado (los errores ya están en el DOM). */
const scheduleAfterPaint = (fn: () => void): void => {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => fn());
    return;
  }
  setTimeout(fn, 0);
};

/**
 * Capa de formulario del producto (spec 036 AC1, AC3, AC4).
 *
 * @example
 * ```ts
 * const form = useAppForm({
 *   schema: employeeFormSchema,
 *   defaultValues: { name: "", rut: "" },
 *   onSubmit: async (values) => { await employeeService.create(values); },
 * });
 *
 * // En la vista (por props):
 * <Input id="name" value={form.values.name} onChange={...} error={form.getError("name")} />
 * ```
 */
export const useAppForm = <TValues extends object, TPayload = TValues>(
  options: UseAppFormOptions<TValues, TPayload>,
): UseAppFormResult<TValues> => {
  const {
    schema,
    defaultValues,
    onSubmit,
    onInvalid,
    normalize,
    serialize,
    nullableFields = [],
    formId: providedFormId,
  } = options;

  const generatedId = useId();
  const formId = providedFormId ?? `app-form-${generatedId}`;
  const submitGuard = useRef<boolean>(false);
  /**
   * Valores por defecto **vivos**.
   *
   * TanStack Form vuelve a aplicar `defaultValues` en cada actualizacion de
   * opciones si el formulario no esta "tocado": un `reset(valores)` que no
   * actualiza esta referencia se deshace en el siguiente render. Por eso el
   * `reset` de la capa actualiza la referencia y el formulario a la vez.
   */
  const defaultValuesRef = useRef<TValues>(defaultValues);

  const form = useForm<
    TValues,
    undefined,
    StandardSchemaV1<TValues, unknown>,
    undefined,
    undefined,
    undefined,
    StandardSchemaV1<TValues, unknown>,
    undefined,
    undefined,
    undefined,
    undefined,
    never
  >({
    formId,
    defaultValues: defaultValuesRef.current,
    // El mismo schema en `onSubmit` y `onChange`: el error se calcula al
    // enviar y se recalcula en vivo mientras el usuario escribe. La capa de
    // presentación decide *cuándo se ve* (tras el primer intento).
    validators: { onSubmit: schema, onChange: schema },
    onSubmit: async ({ value }) => {
      // `value` ya viene normalizado: `submit()` normaliza **antes** de
      // validar, de modo que la validacion y el payload ven lo mismo.
      // `serialize` actua **despues** de validar y solo sobre el payload.
      // Sin `serialize`, el payload **es** el estado del formulario (el
      // generico `TPayload` solo se aparta cuando hay serializacion).
      const payload = serialize ? serialize(value) : (value as unknown as TPayload);
      await onSubmit(payload);
    },
  });

  const state = useStore(form.store);

  /**
   * Los errores solo se exponen **después del primer intento de envío**:
   * antes de eso el usuario ve el formulario limpio (sin el patrón "error
   * antes de tocar el campo").
   */
  const errors = useMemo<AppFormErrors>(() => {
    if (state.submissionAttempts === 0) return {};
    const result: AppFormErrors = {};
    const fieldMeta = state.fieldMeta as unknown as Record<string, { errors?: unknown }>;
    for (const [name, meta] of Object.entries(fieldMeta)) {
      const message = toErrorMessage(meta.errors);
      if (message) result[name] = message;
    }
    return result;
  }, [state.submissionAttempts, state.fieldMeta]);

  const formError = useMemo(() => {
    if (state.submissionAttempts === 0) return undefined;
    // Las reglas que **no pertenecen a un campo** (un `superRefine` sin
    // `path`) llegan al estado del formulario con la clave vacia: son el error
    // de formulario y no el de ningun input.
    const formLevelError = errors[FORM_LEVEL_ERROR_KEY];
    if (formLevelError) return formLevelError;
    return toErrorMessage(state.errorMap?.onSubmit ?? state.errors);
  }, [state.submissionAttempts, state.errorMap, state.errors, errors]);

  const getError = useCallback((field: string): string | undefined => errors[field], [errors]);

  const setValue = useCallback(
    <K extends keyof TValues & string>(name: K, value: TValues[K]): void => {
      form.setFieldValue(
        name as Parameters<typeof form.setFieldValue>[0],
        value as Parameters<typeof form.setFieldValue>[1],
      );
    },
    [form],
  );

  const field = useCallback(
    <K extends keyof TValues & string>(name: K): AppFormFieldBinding<TValues[K]> => {
      const meta = state.fieldMeta[name];
      return {
        name,
        value: state.values[name],
        error: errors[name],
        onChange: (value: TValues[K]) => {
          setValue(name, value);
        },
        onBlur: () => {
          form.setFieldMeta(name, (previous) => ({ ...previous, isTouched: true }));
        },
        isTouched: Boolean(meta?.isTouched),
        isDirty: Boolean(meta?.isDirty),
      };
    },
    [errors, form, setValue, state.fieldMeta, state.values],
  );

  /**
   * Mueve el foco al primer control inválido.
   *
   * Se localiza por el contrato de a11y (`aria-invalid="true"`) dentro del
   * `<form>`: el orden en el DOM es el orden de lectura, así que el primer
   * inválido es el que el usuario debe corregir primero.
   */
  const focusFirstInvalidField = useCallback((): void => {
    if (typeof document === "undefined") return;
    const root = document.getElementById(formId);
    const invalid = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalid?.focus();
  }, [formId]);

  /**
   * Normaliza los valores y los **escribe en el formulario** antes de
   * validar.
   *
   * Normalizar antes de validar es lo que permite que el schema de formulario
   * sea una copia **exacta** del schema del backend (`required`, `minLength`,
   * `pattern`, `enum`...): si la cadena vacia se omitiera despues de
   * validar, el schema tendria que accepting `""` para todo campo opcional y
   * dejaria de ser espejo del contrato.
   */
  const applyNormalization = useCallback(
    (values: TValues): TValues => {
      const normalized = normalize
        ? normalize(values)
        : normalizeFormValues(values, nullableFields);

      for (const [key, value] of Object.entries(normalized)) {
        const current = form.getFieldValue(key as Parameters<typeof form.getFieldValue>[0]);
        if (Object.is(current, value)) continue;
        form.setFieldValue(
          key as Parameters<typeof form.setFieldValue>[0],
          value as Parameters<typeof form.setFieldValue>[1],
          { dontValidate: true, dontRunListeners: true },
        );
      }
      return normalized;
    },
    [form, normalize, nullableFields],
  );

  const submit = useCallback((): void => {
    void withSubmitGuard(submitGuard, async () => {
      try {
        applyNormalization(form.state.values);
        // La normalización escribe valores **después** de la última validación
        // en vivo: un campo opcional vacío (p. ej. una fecha sin fin) queda
        // marcado como inválido en la validación anterior. Sin refrescar,
        // TanStack conservaría ese error obsoleto y bloquearía el envío de un
        // formulario que ya es correcto.
        await form.validate("change");
        await form.handleSubmit();
      } catch (error) {
        // El consumidor ya notifica el fallo a la UI; aquí solo se registra
        // para no perder el error en el camino.
        logger.error("Fallo el envío del formulario", error);
      }
      if (!form.state.isValid) {
        onInvalid?.(errors);
        scheduleAfterPaint(focusFirstInvalidField);
      }
    });
  }, [applyNormalization, errors, focusFirstInvalidField, form, onInvalid]);

  const reset = useCallback(
    (values?: TValues): void => {
      if (values) defaultValuesRef.current = values;
      form.reset(values);
    },
    [form],
  );

  const formProps = useMemo(
    () => ({
      id: formId,
      noValidate: true as const,
      onSubmit: (event: { preventDefault: () => void }) => {
        event.preventDefault();
        submit();
      },
      "data-app-form": formId,
    }),
    [formId, submit],
  );

  return {
    form,
    values: state.values,
    errors,
    formError,
    getError,
    field,
    setValue,
    isSubmitting: state.isSubmitting,
    isValid: state.isValid,
    isDirty: state.isDirty,
    submissionAttempts: state.submissionAttempts,
    submit,
    submitGuard,
    focusFirstInvalidField,
    formProps,
    reset,
  };
};
