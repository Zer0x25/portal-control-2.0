import { maskConfigValue } from "./smtpSecrets";
import {
  BRAND_LOGO_FALLBACK,
  BRAND_LOGO_KEY,
  validateBrandLogoValue,
  type BrandLogoValue,
} from "./brandLogo";
import { AppError, ForbiddenError, ValidationError } from "../../../utils/AppError";
import { toCaughtError } from "../../../utils/caughtError";
import type { ConfigDependencies, PolicyFile } from "./contracts";
const policyKey = "company_policy_meta",
  url = "/api/configs/public/company-policy/file";
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}
export function createConfigFlows<Time, Closure>(deps: ConfigDependencies<Time, Closure>) {
  const keyValue = (key: unknown) => {
    if (!key || typeof key !== "string")
      throw new ValidationError("Falta la clave de configuración o es inválida");
    return key;
  };
  return {
    time: () => deps.time(),
    list: async (role?: string) =>
      (await deps.list(role)).map((entry) => ({
        ...entry,
        value: maskConfigValue(entry.key, entry.value),
      })),
    get: async (key: unknown, role?: string) => {
      const valid = keyValue(key);
      try {
        return maskConfigValue(valid, await deps.get(valid, role));
      } catch (error) {
        if (toCaughtError(error).message === "FORBIDDEN")
          throw new ForbiddenError("Acceso denegado");
        throw error;
      }
    },
    set: async (key: unknown, value: unknown, actor?: string) => {
      const valid = keyValue(key);
      // Spec 027: la clave de marca se valida en el flow (400 en español).
      const prepared = valid === BRAND_LOGO_KEY ? validateBrandLogoValue(value) : value;
      try {
        return maskConfigValue(valid, await deps.set(valid, prepared, actor || "SYSTEM"));
      } catch (error) {
        const caught = toCaughtError(error);
        if (caught.message === "LOCK_DATE_BLOCKED")
          throw new AppError(
            caught.message_display ||
              `No se puede cerrar el periodo hasta el ${value}. Existen ítems pendientes que requieren atención.`,
            400,
            "LOCK_DATE_BLOCKED",
          );
        throw error;
      }
    },
    closure: async (date: unknown) => {
      if (!date || typeof date !== "string")
        throw new ValidationError("Falta la fecha de cierre o es inválida");
      return deps.closure(date);
    },
    policy: async () => {
      const value = await deps.get(policyKey);
      return object(value) ? { ...value, url } : null;
    },
    download: async () => {
      const value = await deps.get(policyKey);
      return object(value) ? deps.download(value) : null;
    },
    upload: async (file: PolicyFile | undefined, actor?: string) => {
      if (!file) throw new ValidationError("Debes adjuntar un archivo PDF.");
      const username = actor || "SYSTEM";
      let previous: unknown;
      const next = { ...file, uploadedAt: deps.now(), uploadedBy: username };
      try {
        await deps.validateFile(file);
        previous = await deps.replacePolicy(next, username);
      } catch (error) {
        await deps.removeFile(file.filename);
        throw error;
      }
      if (object(previous) && "filename" in previous) {
        const old = String(previous.filename);
        if (old && old !== file.filename) await deps.removeFile(old);
      }
      return { message: "Reglamento actualizado correctamente.", ...next, url };
    },
    brandLogo: async () => {
      let stored: unknown;
      try {
        stored = await deps.get(BRAND_LOGO_KEY);
      } catch {
        return null;
      }
      let parsed: BrandLogoValue;
      try {
        parsed = validateBrandLogoValue(stored);
      } catch {
        return null;
      }
      const logoUrl =
        parsed.source.kind === "upload" ? "/api/configs/public/brand-logo/file" : undefined;
      return { ...parsed, url: logoUrl };
    },
    downloadLogo: async () => {
      const value = await deps.get(BRAND_LOGO_KEY);
      if (!object(value)) return null;
      try {
        const parsed = validateBrandLogoValue(value);
        if (parsed.source.kind !== "upload") return null;
        return deps.downloadLogo({ filename: parsed.source.ref, originalName: parsed.source.ref });
      } catch {
        return null;
      }
    },
    uploadLogo: async (file: PolicyFile | undefined, actor?: string) => {
      if (!file) throw new ValidationError("Debes adjuntar una imagen PNG, JPG o WebP.");
      const username = actor || "SYSTEM";
      let previous: BrandLogoValue | null = null;
      try {
        previous = validateBrandLogoValue(await deps.get(BRAND_LOGO_KEY));
      } catch {
        previous = null;
      }
      const next: BrandLogoValue = {
        source: { kind: "upload", ref: file.filename },
        width: previous?.width ?? BRAND_LOGO_FALLBACK.width,
        height: previous?.height ?? BRAND_LOGO_FALLBACK.height,
      };
      try {
        await deps.validateLogoFile(file);
        await deps.set(BRAND_LOGO_KEY, next, username);
      } catch (error) {
        await deps.removeLogoFile(file.filename);
        throw error;
      }
      const oldRef = previous?.source.kind === "upload" ? previous.source.ref : null;
      if (oldRef && oldRef !== file.filename) await deps.removeLogoFile(oldRef);
      return {
        message: "Logo actualizado correctamente.",
        ...next,
        url: "/api/configs/public/brand-logo/file",
      };
    },
  };
}
export type ConfigFlows = ReturnType<typeof createConfigFlows>;
