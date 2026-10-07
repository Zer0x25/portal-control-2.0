import { maskConfigValue, mergeSmtpSecrets } from "./smtpSecrets";
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
      try {
        const prepared =
          valid === "SMTP_CONFIG"
            ? mergeSmtpSecrets(value, await deps.get(valid, "Administrador"))
            : value;
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
  };
}
export type ConfigFlows = ReturnType<typeof createConfigFlows>;
