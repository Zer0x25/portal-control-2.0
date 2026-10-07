import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
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
    await fs.unlink(path.join(directory, path.basename(filename))).catch(() => undefined);
  },
};
