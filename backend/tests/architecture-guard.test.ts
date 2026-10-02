import { describe, it, expect } from "vitest";
import { ROUTE_MOUNTS } from "../src/app";
import { collectRoutes } from "./helpers/routeManifest";
import fs from "fs";
import path from "path";

/**
 * Mutating routes that intentionally have no `validate(...)` middleware.
 *
 * Every entry takes no JSON body, or validates its own payload because it is a
 * file upload rather than a JSON document. The list is a ratchet: adding a new
 * unvalidated route fails this test until it is either validated or justified.
 */
const ALLOWED_UNVALIDATED_ROUTES = [
  // Authenticated session/MFA lifecycle: derives its target from the token.
  "POST /api/auth/logout",
  "POST /api/auth/mfa/setup",
  // Maintenance triggers: no client-supplied payload.
  "POST /api/admin/trigger-autoclose",
  "POST /api/admin/trigger-accounting-autoclose",
  "POST /api/admin/trigger-backup",
  "POST /api/admin/restart",
  "POST /api/records/auto-close",
  // Path-parameter only; the controller checks `id` is a non-empty string.
  "PATCH /api/scheduled-reports/:id/toggle",
  "PUT /api/notes/:id",
  // Multipart uploads: validated by multer file filters and the controller.
  "POST /api/configs/company-policy",
  "POST /api/import/preview",
  // Controller parses the body with SmtpProfileSchema before use.
  "POST /api/email/verify",
];

describe("Architectural Guardrails", () => {
  describe("Logic-First Compliance (Controllers vs Services)", () => {
    it("Controllers should not import prisma directly from db service", () => {
      const controllersDir = path.join(__dirname, "../src/controllers");
      const files = fs.readdirSync(controllersDir);

      const offenders = files.filter((file) => {
        if (!file.endsWith(".ts")) return false;
        const content = fs.readFileSync(path.join(controllersDir, file), "utf8");
        // Check for direct prisma imports. We allow importing 'prisma' from types if needed,
        // but not the actual client instance from "../services/db"
        return content.includes('import prisma from "../services/db"');
      });

      expect(
        offenders,
        `The following controllers are bypassing the Service layer by importing prisma directly: \n${offenders.join("\n")}. \nLogic should move to a Service.`,
      ).toEqual([]);
    });

    it("Controllers should remain lean (line count check)", () => {
      const controllersDir = path.join(__dirname, "../src/controllers");
      const files = fs.readdirSync(controllersDir);
      const THRESHOLD = 500; // Large enough for now, but should capture major bloating

      const bloated = files.filter((file) => {
        if (!file.endsWith(".ts")) return false;
        const lines = fs.readFileSync(path.join(controllersDir, file), "utf8").split("\n").length;
        return lines > THRESHOLD;
      });

      expect(
        bloated,
        `The following controllers exceed the ${THRESHOLD} lines threshold, suggesting stray business logic: \n${bloated.join("\n")}`,
      ).toEqual([]);
    });
  });

  describe("Boundary Zod Compliance", () => {
    it("Every POST/PUT/PATCH route should have the 'validate' middleware", () => {
      const routes = collectRoutes(ROUTE_MOUNTS);

      // Guard against silent vacuity: the previous implementation walked
      // `app._router.stack`, which Express 5 no longer exposes, so the route
      // list was always empty and this test always passed.
      expect(routes.length).toBeGreaterThan(0);

      const unprotected = routes
        .filter(
          (route) =>
            route.methods.some((method) => ["POST", "PUT", "PATCH"].includes(method)) &&
            !route.hasValidate &&
            !route.fullPath.startsWith("/api/health"),
        )
        .map((route) => `${route.methods.join(",")} ${route.fullPath}`);

      // Ratchet: the remaining entries accept no JSON body, or validate it
      // themselves (a Zod parse or an explicit guard) because the payload is a
      // file upload rather than JSON. New gaps must fail; known ones must be
      // justified here.
      expect(
        [...unprotected].sort(),
        "Detected mutating routes missing Zod validation middleware",
      ).toEqual([...ALLOWED_UNVALIDATED_ROUTES].sort());
    });
  });
});
