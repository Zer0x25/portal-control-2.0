import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { logger } from "./logger";
import { swaggerSpec, publicApiUrl } from "./openapi";
export { swaggerSpec, publicApiUrl } from "./openapi";

export const setupSwagger = (app: Express) => {
  // Swagger Page
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Docs in JSON format
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  logger.info(`📖 Swagger Docs available at ${publicApiUrl}/api-docs`);
};
