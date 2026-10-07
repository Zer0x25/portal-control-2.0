/** Neutral multipart errors for native HTTP upload handling. */
export class UploadError extends Error {
  constructor(
    public readonly code: "LIMIT_FILE_SIZE" | "LIMIT_FILE_COUNT" | "LIMIT_UNEXPECTED_FILE",
    public readonly field?: string,
  ) {
    super("Error al procesar el archivo");
    this.name = "UploadError";
  }
}
