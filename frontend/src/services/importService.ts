import { apiClient } from "./apiClient";

export interface PreviewImportResult<TRow = Record<string, unknown>> {
  rows: TRow[];
  total?: number;
}

export const importService = {
  /**
   * Send a file to the backend to get a JSON preview
   */
  previewImport: async <TRow = Record<string, unknown>>(
    file: File,
    schema?: unknown,
  ): Promise<PreviewImportResult<TRow>> => {
    const formData = new FormData();
    formData.append("file", file);
    if (schema) {
      formData.append(
        "schema",
        JSON.stringify(schema, (_key, value: unknown) => (value === String ? "String" : value)),
      );
    }

    return (await apiClient.post("/api/import/preview" as never, {
      body: formData,
    })) as PreviewImportResult<TRow>;
  },
};
