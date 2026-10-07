import { authService } from "./authService";
import { API_BASE_URL } from "./apiBase";

const API_URL = API_BASE_URL;

export const importService = {
  /**
   * Send a file to the backend to get a JSON preview
   */
  previewImport: async (file: File, schema?: unknown) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (schema) {
        formData.append(
          "schema",
          JSON.stringify(schema, (_key, value: unknown) => (value === String ? "String" : value)),
        );
      }

      const response = await fetch(`${API_URL}/import/preview`, {
        method: "POST",
        headers: {
          ...(authService.getAuthHeader() as Record<string, string>),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Error al procesar el archivo" }));
        throw new Error(error.message || "Error al procesar el archivo");
      }

      return await response.json();
    } catch (error) {
      console.error("Preview import error:", error);
      throw error;
    }
  },
};
