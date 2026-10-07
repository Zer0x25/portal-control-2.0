import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
const root = path.resolve(__dirname, "../..");
it("default executable starts Fastify without the Express application", () => {
  const entry = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
  expect(entry).toContain("./fastify/main");
  expect(entry).not.toContain('from "./app"');
});
it("runtime dependencies contain native Fastify uploads/docs and exclude Express middleware", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  for (const name of [
    "express",
    "express-rate-limit",
    "compression",
    "cors",
    "helmet",
    "multer",
    "swagger-ui-express",
  ]) {
    expect(pkg.dependencies).not.toHaveProperty(name);
    expect(pkg.devDependencies).not.toHaveProperty(name);
  }
  expect(pkg.dependencies).toHaveProperty("swagger-ui-dist");
  expect(pkg.dependencies).toHaveProperty("prisma");
});
