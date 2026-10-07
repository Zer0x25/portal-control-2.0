import fs from "node:fs";
import path from "node:path";
import swaggerJSDoc from "swagger-jsdoc";
import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { ZodType } from "zod";
import * as schemas from "../models/schemas";

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

const servers = [
  {
    url: publicApiUrl,
    description: process.env.PUBLIC_API_URL
      ? "Servidor (PUBLIC_API_URL)"
      : "Servidor de Desarrollo",
  },
];

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PORTAL API Documentation",
      version: "1.0.0",
      description:
        "Documentación técnica de la API de PORTAL - Sistema de Gestión de Personal y Horarios.",
    },
    servers,
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
  apis: ["./src/platform/openapi/*.ts", "./src/index.ts"],
};

export const swaggerSpec = __filename.includes(`${path.sep}dist${path.sep}`)
  ? {
      ...JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../docs/swagger.json"), "utf8")),
      servers,
    }
  : swaggerJSDoc(options);
