import { useCallback } from "react";
import { importService } from "../../../services/importService";

/** Encapsula el acceso al servicio de previsualización del importador. */
export const useImportPreview = () =>
  useCallback(
    async <T extends object>(file: File, schema: Record<string, unknown>): Promise<T[]> => {
      const { rows } = await importService.previewImport(file, schema);
      return rows as T[];
    },
    [],
  );
