import { expect, it } from "vitest";
import fs from "node:fs";
import Fastify from "fastify";
import { registerFastifyDocs } from "../../src/platform/fastify/docs";
it("serves HTML and Swagger JavaScript with explicit UTF-8 and unchanged asset bytes", async () => {
  const app = Fastify();
  registerFastifyDocs(app);
  try {
    for (const url of [
      "/api-docs",
      "/api-docs/swagger-ui-bundle.js",
      "/api-docs/swagger-ui-standalone-preset.js",
      "/api-docs/init.js",
    ]) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("charset=utf-8");
      if (url.endsWith("bundle.js"))
        expect(
          response.rawPayload.equals(
            fs.readFileSync(require.resolve("swagger-ui-dist/swagger-ui-bundle.js")),
          ),
        ).toBe(true);
    }
  } finally {
    await app.close();
  }
});
