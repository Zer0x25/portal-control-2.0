import { ValidationError } from "../../../utils/AppError";

/** Clave global de marca (Opción A, spec 027: sin tenant, por instancia). */
export const BRAND_LOGO_KEY = "branding_logo";
export const BRAND_LOGO_MIN_PX = 16;
export const BRAND_LOGO_MAX_PX = 512;
/** Dimensiones del asset empaquetado (fallback cuando no hay configuración). */
export const BRAND_LOGO_FALLBACK = { width: 512, height: 188 } as const;

export const BRAND_LOGO_UPLOAD_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
export type BrandLogoUploadMime = (typeof BRAND_LOGO_UPLOAD_MIMES)[number];
/** Límite de subida de logo (menor que company-policy: es solo marca). */
export const BRAND_LOGO_MAX_BYTES = 5 * 1024 * 1024;

export interface BrandLogoSource {
  kind: "upload" | "url";
  /** upload: filename generado por el storage; url: URL https remota. */
  ref: string;
}

export interface BrandLogoValue {
  source: BrandLogoSource;
  width: number;
  height: number;
}

function fail(message: string): never {
  throw new ValidationError(message);
}

function dimension(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value))
    fail(`El ${name} del logo debe ser un número entero en píxeles`);
  if (value < BRAND_LOGO_MIN_PX || value > BRAND_LOGO_MAX_PX)
    fail(
      `El ${name} del logo debe estar entre ${BRAND_LOGO_MIN_PX} y ${BRAND_LOGO_MAX_PX} píxeles`,
    );
  return value;
}

/**
 * Valida el valor de `branding_logo` con mensajes en español (400).
 * No toca disco ni red: solo forma y rangos.
 */
export function validateBrandLogoValue(value: unknown): BrandLogoValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("El logo debe ser un objeto con fuente y tamaño");
  const record = value as Record<string, unknown>;
  const source = record.source;
  if (!source || typeof source !== "object" || Array.isArray(source))
    fail("El logo debe indicar su fuente (archivo subido o URL)");
  const { kind, ref } = source as Record<string, unknown>;
  if (kind !== "upload" && kind !== "url")
    fail("La fuente del logo debe ser 'upload' o 'url'");
  if (typeof ref !== "string" || ref.length === 0) fail("Falta la referencia del logo");
  if (kind === "url") {
    let parsed: URL;
    try {
      parsed = new URL(ref);
    } catch {
      fail("La URL del logo no es válida");
    }
    if (parsed!.protocol !== "https:")
      fail("La URL del logo debe usar HTTPS");
  } else {
    // upload: solo el filename generado por brandLogoStorage (sin rutas).
    if (ref.includes("/") || ref.includes("\\") || ref.includes(".."))
      fail("La referencia del archivo del logo no es válida");
    if (!/\.(png|jpe?g|webp)$/i.test(ref))
      fail("El archivo del logo debe ser PNG, JPG o WebP");
  }
  return {
    source: { kind, ref },
    width: dimension("ancho", record.width),
    height: dimension("alto", record.height),
  };
}

/** Valida el MIME declarado del multipart antes de almacenar (el storage revalida bytes). */
export function validateBrandLogoMime(mime: string): asserts mime is BrandLogoUploadMime {
  if (!(BRAND_LOGO_UPLOAD_MIMES as readonly string[]).includes(mime))
    throw new ValidationError("Solo se permiten imágenes PNG, JPG o WebP");
}
