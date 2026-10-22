import { z } from "zod";

/**
 * Spec 036 T7 (AC2): comparacion entre el JSON Schema que genera Zod y el
 * artefacto OpenAPI del backend (`backend/docs/swagger.json`).
 *
 * El helper es **declarativo**: no reimplementa la validacion, solo contrasta
 * los atributos que OpenAPI puede expresar (`required`, `minLength`,
 * `maxLength`, `pattern`, `enum`, `minimum`, `maximum`, `format`, `nullable`).
 * Las reglas que OpenAPI **no** puede expresar (los `.refine()` del backend)
 * se verifican con los fixtures dorados de `cases/*.json`.
 */

/** Subconjunto de OpenAPI 3.0 que usa el backend. */
export interface OpenApiSchema {
  type?: string;
  format?: string;
  nullable?: boolean;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  $ref?: string;
  additionalProperties?: boolean;
  default?: unknown;
}

/** Documento OpenAPI completo (el `swagger.json` del backend). */
export interface OpenApiDocument {
  components: { schemas: Record<string, OpenApiSchema> };
}

/** Divergencia detectada entre el schema del formulario y el del backend. */
export interface SchemaMismatch {
  /** Ruta del atributo dentro del schema (`empleado.email.minLength`). */
  readonly path: string;
  /** Atributo comparado. */
  readonly attribute: string;
  /** Valor del schema del formulario. */
  readonly frontend: unknown;
  /** Valor del schema del backend. */
  readonly backend: unknown;
}

/** Resuelve una referencia `#/components/schemas/X` del documento OpenAPI. */
export const resolveRef = (schema: OpenApiSchema, document: OpenApiDocument): OpenApiSchema => {
  if (!schema.$ref) return schema;
  const name = schema.$ref.split("/").pop() as string;
  return document.components.schemas[name] ?? schema;
};

/** Resuelve `allOf` (los schemas compuestos del backend se fusionan). */
const resolveAllOf = (schema: OpenApiSchema, document: OpenApiDocument): OpenApiSchema => {
  if (!schema.allOf?.length) return schema;
  const [first, ...rest] = schema.allOf.map((part) => resolveRef(part, document));
  const merged: OpenApiSchema = { ...first };
  for (const part of rest) {
    merged.properties = { ...(merged.properties ?? {}), ...(part.properties ?? {}) };
    merged.required = [...(merged.required ?? []), ...(part.required ?? [])];
  }
  return merged;
};

/** Resuelve `$ref` y `allOf` en un solo paso. */
export const resolveSchema = (schema: OpenApiSchema, document: OpenApiDocument): OpenApiSchema =>
  resolveAllOf(resolveRef(schema, document), document);

/** Genera el JSON Schema (OpenAPI 3.0) de un schema Zod. */
export const toOpenApiSchema = (schema: z.ZodType): OpenApiSchema =>
  z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io: "input",
    unrepresentable: "any",
  }) as OpenApiSchema;

/** Los `format` que ya implican su `pattern`: comparar el patron seria ruido. */
const FORMAT_IMPLIES_PATTERN = new Set(["email", "date-time", "uri", "uuid"]);

/**
 * Zod anade `maximum: 2^53-1` a todo entero (limite del entero seguro).
 *
 * El generador OpenAPI del backend (`@asteasolutions/zod-to-openapi`) no lo
 * expresa, asi que comparar ese atributo seria exigir una divergencia
 * artificial. Se ignora **solo** ese valor exacto y **solo** cuando el
 * backend no declara maximo propio.
 */
const SAFE_INTEGER_MAXIMUM = Number.MAX_SAFE_INTEGER;

const sameEnum = (left: unknown[], right: unknown[]): boolean => {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].map((value) => JSON.stringify(value)).sort();
  const rightSorted = [...right].map((value) => JSON.stringify(value)).sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
};

/** Opciones de la comparacion de un schema del formulario. */
export interface CompareOptions {
  /** Campos que solo existen en el formulario (no se comparan). */
  readonly localFields?: readonly string[];
  /**
   * Campos que el backend acepta y guarda, pero que su schema OpenAPI no
   * declara (no se comparan: son un hueco de documentacion, no una perdida).
   */
  readonly openApiUndeclaredFields?: readonly string[];
  /** Campos cuyo valor se transforma antes de enviarlo. */
  readonly transformedFields?: readonly string[];
  /** Campos que el formulario exige aunque el backend los admita opcionales. */
  readonly stricterRequired?: readonly string[];
}

/**
 * Compara el schema de un formulario con el schema OpenAPI del backend.
 *
 * Devuelve **todas** las divergencias (no la primera) para que el mensaje de
 * error del test sea util de un vistazo.
 */
export const compareWithBackend = (
  frontend: OpenApiSchema,
  backendRaw: OpenApiSchema,
  document: OpenApiDocument,
  options: CompareOptions = {},
): SchemaMismatch[] => {
  const backend = resolveSchema(backendRaw, document);
  const localFields = new Set(options.localFields ?? []);
  const openApiUndeclaredFields = new Set(options.openApiUndeclaredFields ?? []);
  const transformedFields = new Set(options.transformedFields ?? []);
  const stricterRequired = new Set(options.stricterRequired ?? []);
  const mismatches: SchemaMismatch[] = [];

  const backendProperties = backend.properties ?? {};
  const frontendProperties = frontend.properties ?? {};
  const backendRequired = new Set(backend.required ?? []);
  const frontendRequired = new Set(frontend.required ?? []);

  // 1. Todo campo que el formulario exige, el backend tambien lo exige (salvo
  //    declaracion explicita de divergencia).
  for (const field of frontendRequired) {
    if (
      localFields.has(field) ||
      openApiUndeclaredFields.has(field) ||
      transformedFields.has(field)
    ) {
      continue;
    }
    if (!backendRequired.has(field) && !stricterRequired.has(field)) {
      mismatches.push({
        path: field,
        attribute: "required",
        frontend: true,
        backend: false,
      });
    }
  }

  // 2. Todo campo que el backend exige y el formulario escribe, el formulario
  //    tambien lo exige (si no, el payload seria invalido).
  for (const field of backendRequired) {
    if (!frontendProperties[field]) continue;
    if (!frontendRequired.has(field)) {
      mismatches.push({
        path: field,
        attribute: "required",
        frontend: false,
        backend: true,
      });
    }
  }

  // 3. Campos: el formulario no puede escribir campos que el backend ignora.
  for (const [field, frontendProperty] of Object.entries(frontendProperties)) {
    if (localFields.has(field) || openApiUndeclaredFields.has(field)) continue;
    const backendProperty = backendProperties[field];
    if (!backendProperty) {
      mismatches.push({
        path: field,
        attribute: "property",
        frontend: "presente",
        backend: "ausente",
      });
      continue;
    }
    mismatches.push(
      ...compareProperty(
        frontendProperty,
        backendProperty,
        document,
        field,
        transformedFields.has(field),
      ),
    );
  }

  return mismatches;
};

/** Compara los atributos de un campo. */
const compareProperty = (
  frontendRaw: OpenApiSchema,
  backendRaw: OpenApiSchema,
  document: OpenApiDocument,
  path: string,
  transformed: boolean,
): SchemaMismatch[] => {
  const mismatches: SchemaMismatch[] = [];
  const backend = resolveSchema(backendRaw, document);
  const frontend = frontendRaw;

  // `anyOf`: el frontend debe encajar en al menos una rama del backend.
  if (backend.anyOf?.length) {
    const branchMatches = backend.anyOf.map((branch) =>
      compareProperty(frontend, branch, document, path, transformed),
    );
    const best = branchMatches.reduce(
      (fewest, current) => (current.length < fewest.length ? current : fewest),
      branchMatches[0] ?? [],
    );
    if (best.length === 0) return [];
    return [
      {
        path,
        attribute: "anyOf",
        frontend: JSON.stringify(frontend),
        backend: JSON.stringify(backend.anyOf),
      },
    ];
  }

  const push = (attribute: string, frontendValue: unknown, backendValue: unknown) => {
    mismatches.push({ path, attribute, frontend: frontendValue, backend: backendValue });
  };

  if (frontend.type !== backend.type) {
    // El generador OpenAPI del backend pierde el `.int()` en algunos campos
    // (`shiftReportsPerDay` queda como `number` aunque el backend exige
    // entero). El frontend mantiene el entero: es lo que el backend aplica
    // en el codigo, y un entero es siempre un numero valido.
    const isIntegerArtifact = frontend.type === "integer" && backend.type === "number";
    if (!isIntegerArtifact) {
      push("type", frontend.type, backend.type);
    }
  }

  if (backend.nullable !== frontend.nullable) {
    push("nullable", frontend.nullable ?? false, backend.nullable ?? false);
  }

  if (backend.format !== frontend.format) {
    // Un campo transformado cambia de formato a proposito (documentado).
    if (!transformed) push("format", frontend.format, backend.format);
  }

  if (backend.pattern !== frontend.pattern) {
    // Los `format` (email, date-time) ya implican su propio patron: exigir
    // que coincidan las dos expresiones seria ruido.
    const backendHasFormat = Boolean(backend.format && FORMAT_IMPLIES_PATTERN.has(backend.format));
    if (!backendHasFormat && !transformed) {
      push("pattern", frontend.pattern, backend.pattern);
    }
  }

  if (backend.minLength !== frontend.minLength) {
    push("minLength", frontend.minLength, backend.minLength);
  }

  if (backend.maxLength !== frontend.maxLength) {
    push("maxLength", frontend.maxLength, backend.maxLength);
  }

  if (backend.minimum !== frontend.minimum) {
    push("minimum", frontend.minimum, backend.minimum);
  }

  if (backend.maximum !== frontend.maximum) {
    const isSafeIntegerArtifact =
      frontend.maximum === SAFE_INTEGER_MAXIMUM && backend.maximum === undefined;
    if (!isSafeIntegerArtifact) {
      push("maximum", frontend.maximum, backend.maximum);
    }
  }

  if (backend.enum) {
    if (!frontend.enum || !sameEnum(frontend.enum, backend.enum)) {
      push("enum", frontend.enum, backend.enum);
    }
  } else if (frontend.enum) {
    push("enum", frontend.enum, backend.enum);
  }

  // Elementos de un array (`items`).
  if (backend.items || frontend.items) {
    if (!backend.items || !frontend.items) {
      mismatches.push({
        path,
        attribute: "items",
        frontend: frontend.items ? "presente" : "ausente",
        backend: backend.items ? "presente" : "ausente",
      });
    } else {
      mismatches.push(
        ...compareProperty(frontend.items, backend.items, document, `${path}[]`, transformed),
      );
    }
  }

  // Propiedades anidadas (objetos del backend, como las reglas de correo).
  if (backend.properties && frontend.properties) {
    const backendRequiredNested = new Set(backend.required ?? []);
    const frontendRequiredNested = new Set(frontend.required ?? []);

    for (const field of frontendRequiredNested) {
      if (!backendRequiredNested.has(field)) {
        mismatches.push({
          path: `${path}.${field}`,
          attribute: "required",
          frontend: true,
          backend: false,
        });
      }
    }
    for (const field of backendRequiredNested) {
      if (frontend.properties[field] && !frontendRequiredNested.has(field)) {
        mismatches.push({
          path: `${path}.${field}`,
          attribute: "required",
          frontend: false,
          backend: true,
        });
      }
    }

    for (const [field, frontendProperty] of Object.entries(frontend.properties)) {
      const backendProperty = backend.properties[field];
      if (!backendProperty) {
        mismatches.push({
          path: `${path}.${field}`,
          attribute: "property",
          frontend: "presente",
          backend: "ausente",
        });
        continue;
      }
      mismatches.push(
        ...compareProperty(
          frontendProperty,
          backendProperty,
          document,
          `${path}.${field}`,
          transformed,
        ),
      );
    }
  }

  return mismatches;
};
