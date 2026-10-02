import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { ZodType } from "zod";
import * as schemas from "../models/schemas";
import { logger } from "./logger";

const registry = new OpenAPIRegistry();

/**
 * Runtime guard: el registro de componentes solo acepta esquemas de Zod.
 * Descartamos explícitamente funciones (p.ej. helpers como `isoDateSchema`)
 * para no registrarlas como componentes inválidos.
 */
const isZodSchema = (value: unknown): value is ZodType => value instanceof ZodType;

// Registramos todos los esquemas de Zod que terminan en 'Schema'
Object.entries(schemas).forEach(([name, schema]) => {
  if (name.endsWith("Schema") && isZodSchema(schema)) {
    // Usamos el nombre del esquema sin el sufijo 'Schema' para Swagger
    const componentName = name.replace("Schema", "");
    registry.register(componentName, schema);
  }
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const generatedComponents = generator.generateComponents();

// URL pública del API para el spec: agnóstica por entorno vía
// PUBLIC_API_URL (p. ej. https://api.tu-dominio.com). Sin la variable,
// cae al default local para no romper dev ni el snapshot del contrato.
export const publicApiUrl = process.env.PUBLIC_API_URL?.trim() || "http://localhost:4000";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PORTAL API Documentation",
      version: "1.0.0",
      description:
        "Documentación técnica de la API de PORTAL - Sistema de Gestión de Personal y Horarios.",
    },
    servers: [
      {
        url: publicApiUrl,
        description: process.env.PUBLIC_API_URL
          ? "Servidor (PUBLIC_API_URL)"
          : "Servidor de Desarrollo",
      },
    ],
    components: {
      ...generatedComponents.components,
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/index.ts",
    "./src/controllers/*.ts",
    // "./src/utils/swagger_schemas.ts", // Eliminado en favor de generación automática
  ],
};

export const swaggerSpec = swaggerJSDoc(options);

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
