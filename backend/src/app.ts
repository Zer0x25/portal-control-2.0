import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import authRoutes from "./routes/authRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import timeRecordRoutes from "./routes/timeRecordRoutes";
import userRoutes from "./routes/userRoutes";
import shiftReportRoutes from "./routes/shiftReportRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";
import maintenanceRoutes from "./routes/maintenanceRoutes";
import shiftRoutes from "./routes/shiftRoutes";
import holidayRoutes from "./routes/holidayRoutes";
import leaveRoutes from "./routes/leaveRoutes";
import correctionRoutes from "./routes/correctionRoutes";
import meterRoutes from "./routes/meterRoutes";
import noteRoutes from "./routes/noteRoutes";
import configRoutes from "./routes/configRoutes";
import kpiRoutes from "./routes/kpiRoutes";
import emailRoutes from "./routes/EmailRoutes";
import scheduledReportRoutes from "./routes/scheduledReportRoutes";
import exportRoutes from "./routes/exportRoutes";
import importRoutes from "./routes/importRoutes";
import healthRoutes from "./routes/healthRoutes";
import adminRoutes from "./routes/adminRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { enforceMaintenanceMode } from "./middleware/maintenanceMiddleware";
import { setupSwagger } from "./utils/swagger";
import { initSentry } from "./utils/sentry";
import { getAllowedOrigins, isOriginAllowed } from "./utils/corsPolicy";

const app = express();

// Inicializar Sentry (si aplica)
initSentry();

// Seguridad de Cabeceras
app.set("trust proxy", 1);
app.use(helmet());

// Compresión Gzip
app.use(
  compression({
    filter: (req, res) => {
      if (req.originalUrl.split("?")[0].startsWith("/api/maintenance")) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

// CORS Config: allowlist estricta desde ALLOWED_ORIGINS (spec 002 H-01).
// Sin credenciales: el frontend usa header Authorization, no cookies.
app.use(
  cors({
    origin: (origin, callback) => callback(null, isOriginAllowed(origin, getAllowedOrigins())),
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Límites de body: 1mb global. Las rutas bulk con arrays no acotados
// (records, employees, meters, shifts, holidays) conservan 10mb vía
// pre-parser montado ANTES (spec 002 H-02). Import usa multipart/multer
// con su propio límite, no JSON.
const BULK_JSON_PATHS = [
  "/api/records/bulk",
  "/api/employees/bulk",
  "/api/meters/bulk",
  "/api/shifts/patterns/bulk",
  "/api/shifts/assignments/bulk",
  "/api/holidays/bulk",
];
app.use(BULK_JSON_PATHS, express.json({ limit: "10mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Health endpoints EXENTOS de rate limiting (Monitoring).
// Mounted before the global limiter and the maintenance gate on purpose.
const HEALTH_MOUNT = { prefix: "/api/health", router: healthRoutes } as const;
app.use(HEALTH_MOUNT.prefix, HEALTH_MOUNT.router);

// Rate Limiting Global (Evitar DoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Demasiadas peticiones. Intenta más tarde." },
  skip: (req) => req.path.startsWith("/api/maintenance") || req.path.startsWith("/api/admin"),
});
app.use(globalLimiter);

// Rate Limiting para Exportaciones
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Límite de exportaciones alcanzado. Intenta en 15 minutos." },
});
app.use("/api/export", exportLimiter);

// Rate Limiting para Admin (operaciones sensibles: restore, restart,
// purge, backups). Todo /api/admin ya exige authenticateToken +
// authorizeAdmin; el limiter acota abuso con token robado (spec 002 H-03).
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Límite de operaciones admin alcanzado. Intenta en 15 minutos." },
});
app.use("/api/admin", adminLimiter);

// Swagger Documentation
setupSwagger(app);

// Block regular traffic during critical maintenance windows
app.use(enforceMaintenanceMode);

// API Routes
/**
 * Declarative manifest of every router mount.
 *
 * Express 5 no longer exposes the mount path on a router layer (`layer.path`
 * stays `undefined` and `layer.regexp` was removed), so architecture guards
 * cannot recover prefixes by walking `app.router.stack`. Exporting the mounts
 * keeps this file the single source of truth and lets the guards enumerate the
 * real route surface.
 *
 * `/api/health` is mounted separately above because it must bypass the global
 * rate limiter and the maintenance gate.
 */
export const ROUTE_MOUNTS: ReadonlyArray<{ prefix: string; router: express.Router }> = [
  HEALTH_MOUNT,
  { prefix: "/api/auth", router: authRoutes },
  { prefix: "/api/employees", router: employeeRoutes },
  { prefix: "/api/records", router: timeRecordRoutes },
  { prefix: "/api/users", router: userRoutes },
  { prefix: "/api/shift-reports", router: shiftReportRoutes },
  { prefix: "/api/audit-logs", router: auditLogRoutes },
  { prefix: "/api/maintenance", router: maintenanceRoutes },
  { prefix: "/api/shifts", router: shiftRoutes },
  { prefix: "/api/holidays", router: holidayRoutes },
  { prefix: "/api/leaves", router: leaveRoutes },
  { prefix: "/api/corrections", router: correctionRoutes },
  { prefix: "/api/meters", router: meterRoutes },
  { prefix: "/api/notes", router: noteRoutes },
  { prefix: "/api/configs", router: configRoutes },
  { prefix: "/api/kpis", router: kpiRoutes },
  { prefix: "/api/email", router: emailRoutes },
  { prefix: "/api/scheduled-reports", router: scheduledReportRoutes },
  { prefix: "/api/export", router: exportRoutes },
  { prefix: "/api/import", router: importRoutes },
  { prefix: "/api/admin", router: adminRoutes },
];

// Mounted here so they sit after the rate limiters, Swagger and the
// maintenance gate. Health was already mounted above.
ROUTE_MOUNTS.filter((mount) => mount !== HEALTH_MOUNT).forEach(({ prefix, router }) =>
  app.use(prefix, router),
);

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
