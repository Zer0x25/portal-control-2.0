import { metersPlugin, type MeterFlows } from "../../modules/meters";
import { notesPlugin, type NoteFlows } from "../../modules/notes";
import { configsPlugin, type ConfigHttpService } from "../../modules/configs";
import { emailReportsPlugin, type EmailReportFlows } from "../../modules/emailReports";
import { kpisPlugin, type KpiFlows } from "../../modules/kpis";
import type {} from "./types";
import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import type { AuthUser, AuthFlows } from "../../modules/auth";
import { resolveAccessToken, authPlugin } from "../../modules/auth";
import { holidayPlugin, type HolidayHttpService } from "../../modules/holidays";
import { usersPlugin, type UserFlows } from "../../modules/users";
import { shiftReportsPlugin, type ShiftReportsHttpService } from "../../modules/shiftReports";
import { leavesPlugin, type LeaveFlows } from "../../modules/leaves";
import { correctionsPlugin, type CorrectionFlows } from "../../modules/corrections";
import { shiftsPlugin, type ShiftFlows } from "../../modules/shifts";
import { recordsPlugin, type RecordsHttpService } from "../../modules/records";
import { employeesPlugin, type EmployeesHttpService } from "../../modules/employees";
import { requestContext } from "../../utils/context";
import { AppError } from "../../utils/AppError";
import { errorCategory, mapHttpError, shouldAuditError } from "../../utils/httpError";
import { isOriginAllowed } from "../../utils/corsPolicy";
import { assertMigratedRouteContracts } from "./routeContracts";
import { isRequestValidator } from "./validation";

export interface RouteEntry {
  method: string;
  url: string;
  authenticated: boolean;
  validated: boolean;
}
export interface FastifyDependencies {
  authenticate(token: string | undefined): Promise<AuthUser>;
  holidays: HolidayHttpService;
  users: UserFlows;
  records: RecordsHttpService;
  shifts: ShiftFlows;
  leaves: LeaveFlows;
  kpis: KpiFlows;
  emailReports: EmailReportFlows;
  configs: ConfigHttpService;
  notes: NoteFlows;
  meters: MeterFlows;
  shiftReports: ShiftReportsHttpService;
  corrections: CorrectionFlows;
  employees: EmployeesHttpService;
  auth: {
    flows: AuthFlows;
    inspectFailures(
      ip: string,
      body: unknown,
    ): Promise<{ retryAfter: number; message: string } | null>;
  };
  health: {
    checkDbReady(): Promise<boolean>;
    getDetailedHealth(): Promise<{ database: { status: string } }>;
  };
  maintenance(): { type: string } | null;
  auditError(
    error: unknown,
    request: {
      path: string;
      method: string;
      user?: AuthUser;
      ip: string;
      query: unknown;
      body: unknown;
    },
    category: string,
  ): Promise<void>;
  close(): Promise<void>;
}
export interface FastifyConfig {
  allowedOrigins: string[];
  trustProxy: number;
  rateLimit: { max: number; timeWindow: number };
  development?: boolean;
  logger?: boolean;
}

/** Builds only HTTP. No listeners, schedulers or database pools are started here. */
export function buildFastifyApp(
  deps: FastifyDependencies,
  config: FastifyConfig,
): FastifyInstance & { routeManifest: RouteEntry[] } {
  const app = Fastify({
    logger:
      config.logger === false
        ? false
        : {
            serializers: {
              req: (request: { method: string; url: string }) => ({
                method: request.method,
                url: request.url.split("?")[0],
              }),
            },
            redact: ["req.headers.authorization"],
          },
    trustProxy: (_address, hop) => hop < config.trustProxy,
    bodyLimit: 1024 * 1024,
    exposeHeadRoutes: false,
    routerOptions: { ignoreTrailingSlash: true },
  });
  const manifest: RouteEntry[] = [];
  const result = Object.assign(app, { routeManifest: manifest });
  app.decorateRequest("user", undefined);
  app.addHook("onRoute", (route) => {
    const hooks = Array.isArray(route.preHandler) ? route.preHandler : [route.preHandler];
    for (const method of Array.isArray(route.method) ? route.method : [route.method]) {
      manifest.push({
        method,
        url: route.url,
        authenticated: route.config?.requiresAuth === true,
        validated: hooks.some(isRequestValidator),
      });
    }
  });
  // Callback continuation is created inside ALS so every downstream await shares this request's store.
  app.addHook("onRequest", (_request, _reply, done) => requestContext.run({}, done));
  app.setErrorHandler(async (error, request, reply) => {
    const response = mapHttpError(error, config.development);
    const category = errorCategory(error);
    app.log.error({ err: error, category, requestId: request.id }, "HTTP request failed");
    if (shouldAuditError(error)) {
      await deps
        .auditError(
          error,
          {
            path: request.url.split("?")[0],
            method: request.method,
            user: request.user,
            ip: request.ip,
            query: request.query,
            body: request.body,
          },
          category,
        )
        .catch((err: unknown) => app.log.error({ err }, "Error audit failed"));
    }
    if (response.headers) reply.headers(response.headers);
    return reply.code(response.statusCode).send(response.body);
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      success: false,
      code: "NOT_FOUND",
      message: `Ruta no encontrada: ${request.method} ${request.url.split("?")[0]}`,
    }),
  );
  app.addHook("onClose", () => deps.close());
  app.register(helmet);
  app.register(cors, {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin, config.allowedOrigins)),
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.register(compress);
  app.get("/api/health", async (_request, reply) => {
    const start = Date.now();
    const data = await deps.health.getDetailedHealth();
    const failure = data.database.status !== "OK";
    return reply
      .code(failure ? 503 : 200)
      .send({ success: !failure, data: { ...data, responseTime: Date.now() - start } });
  });
  app.get("/api/health/ready", async () => {
    try {
      await deps.health.checkDbReady();
      return { status: "ready" };
    } catch {
      throw new AppError("Database unreachable", 503, "NOT_READY");
    }
  });
  app.register(async (protectedApp) => {
    await protectedApp.register(rateLimit, {
      ...config.rateLimit,
      global: false,
      errorResponseBuilder: (_request, context) =>
        new AppError(
          "Demasiadas peticiones. Intenta más tarde.",
          context.statusCode,
          "RATE_LIMITED",
        ),
    });
    protectedApp.addHook("onRequest", protectedApp.rateLimit());
    protectedApp.addHook("onRequest", async () => {
      const operation = deps.maintenance();
      if (operation)
        throw new AppError(
          `Sistema temporalmente en mantenimiento por ${operation.type || "operacion critica"}. Intenta nuevamente en unos minutos.`,
          503,
          "MAINTENANCE_MODE",
        );
    });
    const authenticate: import("fastify").onRequestHookHandler = async (request) => {
      const query = request.query;
      const token =
        typeof query === "object" && query !== null && "token" in query ? query.token : undefined;
      const user = await deps.authenticate(
        resolveAccessToken(request.headers.authorization, token),
      );
      request.user = user;
      const context = requestContext.getStore();
      if (!context) throw new Error("Missing request audit context");
      context.username = user.username;
    };
    protectedApp.register(holidayPlugin, { service: deps.holidays, authenticate });
    protectedApp.register(metersPlugin, { service: deps.meters, authenticate });
    protectedApp.register(notesPlugin, { service: deps.notes, authenticate });
    protectedApp.register(configsPlugin, { service: deps.configs, authenticate });
    protectedApp.register(emailReportsPlugin, { service: deps.emailReports, authenticate });
    protectedApp.register(kpisPlugin, { service: deps.kpis, authenticate });
    protectedApp.register(shiftReportsPlugin, { service: deps.shiftReports, authenticate });
    protectedApp.register(leavesPlugin, { service: deps.leaves, authenticate });
    protectedApp.register(correctionsPlugin, { service: deps.corrections, authenticate });
    protectedApp.register(shiftsPlugin, { service: deps.shifts, authenticate });
    protectedApp.register(recordsPlugin, { service: deps.records, authenticate });
    protectedApp.register(employeesPlugin, { service: deps.employees, authenticate });
    protectedApp.register(usersPlugin, { service: deps.users, authenticate });
    protectedApp.register(authPlugin, { ...deps.auth, authenticate });
  });
  app.addHook("onReady", async () => assertMigratedRouteContracts(manifest));
  return result;
}
