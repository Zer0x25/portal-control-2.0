import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PDFDocument } from "pdf-lib";
import { ValidationError } from "../utils/AppError";
import { logger } from "../utils/logger";
import type { PolicyFile } from "../modules/configs";
const directory = path.resolve(process.cwd(), "uploads", "company-policy");
export const companyPolicyStorage = {
  async store(stream: Readable, originalName: string, mimeType: string): Promise<PolicyFile> {
    await fs.mkdir(directory, { recursive: true });
    const filename = `company-policy-${randomUUID()}.pdf`;
    const target = path.join(directory, filename);
    try {
      await pipeline(stream, createWriteStream(target, { flags: "wx" }));
      const info = await fs.stat(target);
      return { filename, originalName, mimeType, size: info.size };
    } catch (error) {
      await fs.unlink(target).catch(() => undefined);
      throw error;
    }
  },
  async validate(file: PolicyFile) {
    const handle = await fs.open(path.join(directory, path.basename(file.filename)), "r");
    try {
      const info = await handle.stat();
      if (info.size > 15 * 1024 * 1024) throw new ValidationError("PDF demasiado grande");
      const header = Buffer.alloc(8);
      const tail = Buffer.alloc(Math.min(info.size, 1024));
      await handle.read(header, 0, header.length, 0);
      await handle.read(tail, 0, tail.length, info.size - tail.length);
      if (
        file.mimeType !== "application/pdf" ||
        info.size !== file.size ||
        !/^%PDF-(1\.[0-7]|2\.0)/.test(header.toString("ascii")) ||
        !/%%EOF\s*$/.test(tail.toString("latin1"))
      ) {
        throw new ValidationError("El archivo no contiene un PDF válido");
      }
      try {
        const document = await PDFDocument.load(await handle.readFile(), {
          throwOnInvalidObject: true,
          updateMetadata: false,
        });
        if (document.getPageCount() === 0) throw new Error("Empty PDF");
      } catch {
        throw new ValidationError("El archivo no contiene un PDF legible sin contraseña");
      }
    } finally {
      await handle.close();
    }
  },
  async download(meta: Record<string, unknown>) {
    if (typeof meta.filename !== "string" || typeof meta.originalName !== "string")
      throw new TypeError("Invalid policy metadata");
    const filePath = path.join(directory, path.basename(meta.filename));
    try {
      await fs.access(filePath);
    } catch {
      return null;
    }
    return { path: filePath, originalName: meta.originalName };
  },
  async remove(filename: string) {
    try {
      await fs.unlink(path.join(directory, path.basename(filename)));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
        logger.error("No se pudo eliminar el archivo de reglamento", { filename, error });
    }
  },
};
