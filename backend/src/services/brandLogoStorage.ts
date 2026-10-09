import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ValidationError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { BRAND_LOGO_MAX_BYTES, validateBrandLogoMime, type PolicyFile } from "../modules/configs";

const directory = path.resolve(process.cwd(), "uploads", "brand-logo");
const EXT_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;

async function assertImageBytes(filePath: string, mime: string): Promise<void> {
  const handle = await fs.open(filePath, "r");
  try {
    const info = await handle.stat();
    if (info.size > BRAND_LOGO_MAX_BYTES)
      throw new ValidationError("El logo supera el tamaño máximo de 5 MB");
    const header = Buffer.alloc(12);
    await handle.read(header, 0, header.length, 0);
    const isPng =
      mime === "image/png" &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47;
    const isJpeg =
      mime === "image/jpeg" && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isWebp =
      mime === "image/webp" &&
      header.toString("ascii", 0, 4) === "RIFF" &&
      header.toString("ascii", 8, 12) === "WEBP";
    if (!isPng && !isJpeg && !isWebp)
      throw new ValidationError("El archivo no contiene una imagen PNG, JPG o WebP válida");
  } finally {
    await handle.close();
  }
}

export const brandLogoStorage = {
  async store(stream: Readable, originalName: string, mimeType: string): Promise<PolicyFile> {
    validateBrandLogoMime(mimeType);
    const ext = EXT_BY_MIME[mimeType as keyof typeof EXT_BY_MIME];
    await fs.mkdir(directory, { recursive: true });
    const filename = `brand-logo-${randomUUID()}.${ext}`;
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
    validateBrandLogoMime(file.mimeType);
    const filePath = path.join(directory, path.basename(file.filename));
    const info = await fs.stat(filePath).catch(() => null);
    if (!info || info.size !== file.size)
      throw new ValidationError("El archivo del logo no se almacenó correctamente");
    await assertImageBytes(filePath, file.mimeType);
  },
  async download(meta: Record<string, unknown>) {
    if (typeof meta.filename !== "string" || typeof meta.originalName !== "string")
      throw new TypeError("Invalid brand logo metadata");
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
        logger.error("No se pudo eliminar el archivo de logo", { filename, error });
    }
  },
};
