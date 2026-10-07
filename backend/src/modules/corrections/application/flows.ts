import { toCaughtError } from "../../../utils/caughtError";
import { AuthError, NotFoundError, ValidationError } from "../../../utils/AppError";
import type {
  CorrectionFlowDependencies,
  CorrectionInput,
  CorrectionPrincipal,
  CorrectionQuery,
  CorrectionStatusInput,
} from "./contracts";
const message = (error: unknown) => toCaughtError(error).message;
const scope = (user?: CorrectionPrincipal) => ({
  role: user?.role || "Usuario",
  employeeId: user?.employeeId || undefined,
});
export function createCorrectionFlows<Row, List, Stats, History>(
  deps: CorrectionFlowDependencies<Row, List, Stats, History>,
) {
  return {
    async list(query: CorrectionQuery, user?: CorrectionPrincipal) {
      return deps.service.list(
        {
          since: query.since,
          limit: query.limit ? Number(query.limit) : undefined,
          offset: query.offset ? Number(query.offset) : undefined,
          status: query.status,
        },
        scope(user),
      );
    },
    async create(
      input: CorrectionInput,
      user?: CorrectionPrincipal,
    ): Promise<{ status: 201; body: Row } | { status: 403; body: { message: string } }> {
      if (!user) throw new AuthError("No autenticado");
      try {
        return {
          status: 201,
          body: await deps.service.create(input, {
            ...scope(user),
            id: user.id,
            username: user.username,
          }),
        };
      } catch (error) {
        if (message(error) === "FORBIDDEN_OWNERSHIP")
          return {
            status: 403,
            body: {
              message: "Acceso denegado: Solo puede crear solicitudes para su propio registro.",
            },
          };
        throw error;
      }
    },
    async updateStatus(id: string, input: CorrectionStatusInput, user?: CorrectionPrincipal) {
      if (!id) throw new ValidationError("ID inválido");
      if (!user) throw new AuthError("No autenticado");
      try {
        return await deps.service.updateStatus(id, {
          status: input.status,
          resolvedBy: input.resolvedBy || user.username,
          rejectionReason: input.rejectionReason,
          actorUsername: user.username,
          actorRole: user.role,
        });
      } catch (error) {
        if (message(error) === "NOT_FOUND") throw new NotFoundError("Solicitud no encontrada");
        throw error;
      }
    },
    async stats(user?: CorrectionPrincipal) {
      return deps.service.stats(scope(user));
    },
    async history(id: string, user?: CorrectionPrincipal) {
      if (!id) throw new ValidationError("ID inválido");
      try {
        return { data: await deps.service.history(id, scope(user)) };
      } catch (error) {
        if (message(error) === "NOT_FOUND") throw new NotFoundError("Solicitud no encontrada");
        throw error;
      }
    },
  };
}
export type CorrectionFlows = ReturnType<typeof createCorrectionFlows>;
