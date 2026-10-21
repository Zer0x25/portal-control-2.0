import { apiClient } from "./apiClient";

/**
 * Vista previa de una importacion: filas extraidas del archivo y metadatos.
 *
 * El endpoint (`POST /api/import/preview`) devuelve `content?: never` en el
 * contrato OpenAPI, asi que la forma se declara aqui.
 */
export interface ImportPreviewResult {
  rows: Record<string, unknown>[];
  total?: number;
}

export const importService = {
  /**
   * Send a file to the backend to get a JSON preview
   */
  previewImport: async (file: File, schema?: unknown): Promise<ImportPreviewResult> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (schema) {
        formData.append(
          "schema",
          JSON.stringify(schema, (_key, value: unknown) => (value === String ? "String" : value)),
        );
      }

      // El cuerpo es `FormData`: el cliente omite el `Content-Type` para que el
      // navegador fije el `boundary` de `multipart/form-data`.
      return (await apiClient.post("/api/import/preview", {
        body: formData,
      })) as ImportPreviewResult;
    } catch (error) {
      console.error("Preview import error:", error);
      throw error;
    }
  },
};
