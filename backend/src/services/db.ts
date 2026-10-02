import { Prisma, PrismaClient } from "@prisma/client";
import { requestContext } from "../utils/context";
import { SocketService } from "./socketService";

const prismaLogConfig: Prisma.PrismaClientOptions["log"] = ["error", "warn"];

// Runtime client via PgBouncer
const basePrisma = new PrismaClient({
  log: prismaLogConfig,
});

// Direct client for interactive transactions that are incompatible with PgBouncer transaction pooling
const directDatabaseUrl = process.env.DIRECT_URL?.trim();
const directPrisma =
  directDatabaseUrl && directDatabaseUrl.length > 0
    ? new PrismaClient({
        log: prismaLogConfig,
        datasources: {
          db: {
            url: directDatabaseUrl,
          },
        },
      })
    : basePrisma;

type TransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

export async function withDirectTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const context = requestContext.getStore();
  const username = context?.username || "SYSTEM";

  return directPrisma.$transaction(async (tx) => {
    if (!context?.skipTrigger && username) {
      await tx.$executeRaw`SELECT set_config('audit.username', ${username}, true)`;
      await tx.$executeRaw`SELECT set_config('audit.skip_trigger', 'false', true)`;
    }

    return fn(tx as Prisma.TransactionClient);
  }, options);
}

function createExtendedClient(client: PrismaClient) {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const mutations = [
            "create",
            "update",
            "delete",
            "upsert",
            "createMany",
            "updateMany",
            "deleteMany",
            "paginated", // Custom operations if any
          ];

          const isMutation = mutations.includes(operation);
          const context = requestContext.getStore();
          const username = context?.username || "SYSTEM";

          const ignoredModels = [
            "AuditLog",
            "ActiveSession",
            "SystemConfig",
            "SeedingJob",
            "SeedingJobLog",
          ];

          if (isMutation && !context?.skipTrigger) {
            // Use the direct connection for transaction-scoped audit variables and interactive safety.
            return withDirectTransaction(
              async (tx) => {
                if (!model) return query(args);

                // Robust model key lookup (try camelCase then PascalCase)
                const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
                const txAny = tx as Record<string, unknown>;
                const modelClient = (txAny[modelKey] || txAny[model]) as
                  | Record<string, unknown>
                  | undefined;

                if (!modelClient || typeof modelClient[operation] !== "function") {
                  return query(args); // Fallback to original query if lookup fails (should not happen for valid models)
                }

                const modelOperation = modelClient[operation] as (
                  args: unknown,
                ) => Promise<unknown>;
                const result = await modelOperation(args);

                // Audit after success (Application Level)
                // WE DIRECTLY USE client to avoid circular dependency with auditService
                if (!ignoredModels.includes(model)) {
                  let category = "DATA";
                  if (model === "User") category = "USER_MGMT";
                  if (["TimeRecord", "AssignedShift", "ShiftPattern"].includes(model))
                    category = "CTRL_HOURS";
                  if (model === "Holiday") category = "CONFIG";

                  const details = {
                    model,
                    operation,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    id: (result as any)?.id ?? (args as any)?.where?.id ?? "N/A",
                  };

                  client.auditLog
                    .create({
                      data: {
                        actorUsername: username,
                        action: `${model.toUpperCase()}_${operation.toUpperCase()}`,
                        category,
                        severity: "INFO",
                        outcome: "SUCCESS",
                        details,
                      },
                    })
                    .then((log) => {
                      SocketService.emitToAll("auditLog:created", {
                        ...log,
                        details,
                      });
                    })
                    .catch((err) =>
                      console.error(`[Audit-DB-Ext] Failed to log ${model} ${operation}:`, err),
                    );
                }

                return result;
              },
              {
                // Keep transaction small and fast
                timeout: 10000,
              },
            );
          }

          // Default path (queries or skipped mutations)
          return query(args);
        },
      },
    },
  });
}

// Combined Extension for PostgreSQL triggers + Application Audit Logs
// This ensures that mutations are wrapped in a transaction that sets the audit session variables
// AND that application-level audit logs are recorded after success.
export const prisma = createExtendedClient(basePrisma);
export const prismaDirect = directPrisma;

export default prisma;
