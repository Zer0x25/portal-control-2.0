import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { swaggerSpec } from "../../utils/openapi";

export function registerFastifyDocs(app: FastifyInstance) {
  app.get("/api-docs.json", () => swaggerSpec);
  app.get("/api-docs", (_request, reply) =>
    reply.type("text/html; charset=utf-8").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>PORTAL API Documentation</title><link rel="stylesheet" href="/api-docs/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="/api-docs/swagger-ui-bundle.js"></script>
<script src="/api-docs/swagger-ui-standalone-preset.js"></script><script src="/api-docs/init.js"></script></body></html>`),
  );
  app.get("/api-docs/init.js", (_request, reply) =>
    reply
      .type("application/javascript; charset=utf-8")
      .send(
        'window.onload = function () { SwaggerUIBundle({url: "/api-docs.json", dom_id: "#swagger-ui", presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset], layout: "StandaloneLayout"}); };',
      ),
  );
  for (const file of [
    "swagger-ui.css",
    "swagger-ui-bundle.js",
    "swagger-ui-standalone-preset.js",
  ]) {
    app.get(`/api-docs/${file}`, (_request, reply) =>
      reply
        .type(
          file.endsWith("css")
            ? "text/css; charset=utf-8"
            : "application/javascript; charset=utf-8",
        )
        .send(createReadStream(require.resolve(`swagger-ui-dist/${file}`))),
    );
  }
}
