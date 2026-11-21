import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import RequestsTab from "../../../features/supervisor-dashboard/containers/RequestsTab.container";
import { server } from "../../mocks/server";

const mocks = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({ currentUser: { username: "admin" } }),
}));
vi.mock("../../../hooks/useEmployees", () => ({
  useEmployees: () => ({ getEmployeeById: () => ({ name: "Persona de prueba" }) }),
}));
vi.mock("../../../hooks/useToasts", () => ({ useToasts: () => ({ addToast: mocks.addToast }) }));
vi.mock("../../../hooks/useScheduling", async () => {
  const { useCorrectionRequestsQuery } =
    await import("../../../hooks/queries/useCorrectionRequestsQuery");
  const { useCorrectionRequestMutations } =
    await import("../../../hooks/useCorrectionRequestMutations");
  return {
    useScheduling: (status?: string, since?: number) => {
      const query = useCorrectionRequestsQuery(status, since);
      const mutation = useCorrectionRequestMutations();
      return {
        requests: query.data?.pages.flatMap((page) => page.requests) ?? [],
        isLoadingCorrectionRequests: query.isLoading,
        isErrorCorrectionRequests: query.isError,
        refetchCorrectionRequests: query.refetch,
        isFetchNextPageCorrectionRequestsError: query.isFetchNextPageError,
        updateRequestStatus: mutation.updateRequestStatus,
        isUpdatingRequestStatus: mutation.isPending,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
      };
    },
  };
});

describe("rechazo integrado con HTTP simulado", () => {
  it("informa un error al consultar solicitudes y recupera el estado vacío al reintentar", async () => {
    let calls = 0;
    server.use(
      http.get("http://localhost:4000/api/corrections/stats", () =>
        HttpResponse.json({ pending: 0, approved: 0, rejected: 0 }),
      ),
      http.get("http://localhost:4000/api/corrections", () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ message: "Error de prueba" }, { status: 400 })
          : HttpResponse.json({ requests: [], total: 0 });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RequestsTab />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las solicitudes",
    );
    expect(screen.queryByText("AUDITADO. SIN PENDIENTES.")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar carga" }));
    expect(await screen.findByText("AUDITADO. SIN PENDIENTES.")).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it.each(["error HTTP", "fallo de conexión"])(
    "muestra %s, conserva el motivo y confirma el reintento",
    async (failure) => {
      mocks.addToast.mockClear();
      const user = userEvent.setup();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const fixture = {
        id: "solicitud-prueba",
        employeeId: "empleado-prueba",
        timeRecordId: "registro-prueba",
        recordField: "entrada",
        originalValue: "2026-11-20T08:00:00Z",
        requestedValue: "2026-11-20T09:00:00Z",
        reason: "Corrección de prueba",
        status: "pending",
        createdAt: "2026-11-20T12:00:00Z",
      };
      let rejected = false;
      const bodies: unknown[] = [];
      server.use(
        http.get("http://localhost:4000/api/corrections/stats", () =>
          HttpResponse.json({ pending: rejected ? 0 : 1, approved: 0, rejected: rejected ? 1 : 0 }),
        ),
        http.get("http://localhost:4000/api/corrections", () =>
          HttpResponse.json({ requests: rejected ? [] : [fixture], total: rejected ? 0 : 1 }),
        ),
        http.patch(
          "http://localhost:4000/api/corrections/solicitud-prueba/status",
          async ({ request }) => {
            bodies.push(await request.json());
            if (bodies.length === 1)
              return failure === "error HTTP"
                ? HttpResponse.json({ message: "Servicio no disponible" }, { status: 503 })
                : HttpResponse.error();
            rejected = true;
            return HttpResponse.json({ ...fixture, status: "rejected" });
          },
        ),
      );
      render(
        <QueryClientProvider client={queryClient}>
          <RequestsTab />
        </QueryClientProvider>,
      );
      await user.click(await screen.findByRole("button", { name: "Denegar Solicitud" }));
      const dialog = screen.getByRole("dialog", { name: "Motivo de Rechazo" });
      const reason = within(dialog).getByRole("textbox", { name: /Justificación Técnica/ });
      await user.type(reason, "Datos incompletos");
      await user.click(within(dialog).getByRole("button", { name: "Confirmar Rechazo" }));
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "No se pudo rechazar la solicitud:",
      );
      if (failure === "error HTTP")
        expect(within(dialog).getByRole("alert")).toHaveTextContent("Servicio no disponible");
      else
        expect(within(dialog).getByRole("alert")).toHaveTextContent(
          "No se pudo conectar con el servidor",
        );
      expect(reason).toHaveValue("Datos incompletos");
      expect(mocks.addToast).toHaveBeenCalledWith(
        expect.stringContaining("Error al actualizar solicitud:"),
        "error",
      );
      await user.click(within(dialog).getByRole("button", { name: "Confirmar Rechazo" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(bodies).toEqual(
        Array(2).fill({
          status: "rejected",
          resolvedBy: "admin",
          rejectionReason: "Datos incompletos",
        }),
      );
      expect(mocks.addToast).toHaveBeenCalledWith("Estado de solicitud actualizado", "success");
      expect(await screen.findByText("AUDITADO. SIN PENDIENTES.")).toBeInTheDocument();
    },
  );
});
