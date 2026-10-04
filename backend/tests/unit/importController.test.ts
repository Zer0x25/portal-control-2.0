import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { previewImport } from "../../src/controllers/ImportController";
import { errorHandler } from "../../src/middleware/errorHandler";

const app = express();
app.use(express.json());

// Sin multer real: inyecta el buffer directamente (el controller solo lee req.file.buffer).
function withFile(buffer: Buffer) {
  return (req: any, _res: any, next: any) => {
    req.file = { buffer };
    req.body = {}; // multer siempre deja body (aunque vacío)
    next();
  };
}

app.post("/preview-garbage", withFile(Buffer.from("esto no es un excel")), previewImport);
app.use(errorHandler);

describe("Import preview (caza-bugs 2026-10-04)", () => {
  it("archivo no-Excel responde 400, no 500 con mensaje interno", async () => {
    const res = await request(app).post("/preview-garbage");
    expect(res.status).toBe(400);
    expect(res.body?.success).toBe(false);
  });
});
