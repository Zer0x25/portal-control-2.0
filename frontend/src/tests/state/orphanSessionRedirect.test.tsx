import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { HashRouter, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import App from "../../App";
import PersistentLayoutContainer from "../../components/layout/PersistentLayout.container";
import { ROUTES, STORAGE_KEYS } from "../../constants";
import ProtectedRoute from "../../router/ProtectedRoute";
import { useStore } from "../../store/useStore";
import type { User } from "../../types";
import { mockUrl } from "../mocks/handlers";
import { server } from "../mocks/server";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createOrphanUser = () => ({
  id: "qa-orphan-user",
  username: "qa_e2e_auth_orphan",
  role: "Administrador" as const,
  employeeId: undefined,
  isDeleted: false,
  lastModified: Date.now(),
  syncStatus: "synced" as const,
});

describe("orphan session and unauthenticated protected route redirect", () => {
  const originalState = useStore.getState();

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useStore.setState(originalState, true);
    window.location.hash = "";
    server.use(
      http.get(mockUrl("/api/health/ready"), () =>
        HttpResponse.json({ status: "healthy", timestamp: new Date().toISOString() }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
    useStore.setState(originalState, true);
    window.location.hash = "";
  });

  it("redirects /#/dashboard with orphan currentUser and no authToken to #/ without blank screen or 401 requests", async () => {
    const requestedPaths: string[] = [];
    const responseStatuses: Array<{ path: string; status: number }> = [];

    const onRequestStart = ({ request }: { request: Request }) => {
      requestedPaths.push(new URL(request.url).pathname);
    };
    const onResponseMocked = ({ request, response }: { request: Request; response: Response }) => {
      responseStatuses.push({
        path: new URL(request.url).pathname,
        status: response.status,
      });
    };

    server.events.on("request:start", onRequestStart);
    server.events.on("response:mocked", onResponseMocked);

    try {
      sessionStorage.removeItem("authToken");
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(createOrphanUser()));
      window.location.hash = `#${ROUTES.DASHBOARD}`;

      await useStore.getState()._verifyAuth();

      const queryClient = createTestQueryClient();
      render(
        <QueryClientProvider client={queryClient}>
          <HashRouter>
            <App />
          </HashRouter>
        </QueryClientProvider>,
      );

      // LoginPage se carga vía React.lazy detrás de Suspense; la resolución del
      // chunk puede superar el timeout por defecto de waitFor bajo carga paralela.
      await waitFor(
        () => {
          expect(screen.getByTestId("login-page")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
      expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
      expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
      expect(window.location.hash).toMatch(/^#\/(?:\?.*)?$/);
      expect(sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER)).toBeNull();
      expect(responseStatuses.filter((entry) => entry.status === 401)).toEqual([]);
      expect(
        requestedPaths.filter(
          (pathname) =>
            pathname !== "/api/health/ready" && pathname !== "/api/configs/public/brand-logo",
        ),
      ).toEqual([]);
    } finally {
      server.events.removeListener("request:start", onRequestStart);
      server.events.removeListener("response:mocked", onResponseMocked);
    }
  });

  it("redirects unauthenticated unknown routes to login instead of mounting PersistentLayout or 404", async () => {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    window.location.hash = "#/ruta-desconocida";

    await useStore.getState()._verifyAuth();

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
    expect(screen.queryByTestId("not-found-page")).not.toBeInTheDocument();
    expect(window.location.hash).toMatch(/^#\/(?:\?.*)?$/);
  });

  it("PersistentLayoutContainer respects isAuthLoading and redirects to login when unauthenticated", () => {
    const queryClient = createTestQueryClient();
    useStore.setState({
      currentUser: null,
      isAuthenticated: false,
      isAuthLoading: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[ROUTES.DASHBOARD]}>
          <Routes>
            <Route path={ROUTES.LOGIN} element={<div data-testid="login-sentinel">Login</div>} />
            <Route element={<PersistentLayoutContainer />}>
              <Route path={ROUTES.DASHBOARD} element={<div data-testid="dashboard-sentinel" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByTestId("login-sentinel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();

    act(() => {
      useStore.setState({
        currentUser: null,
        isAuthenticated: false,
        isAuthLoading: false,
      });
    });

    expect(screen.getByTestId("login-sentinel")).toBeInTheDocument();
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  });

  it("ProtectedRoute redirects when currentUser is null even without requiredRoles and renders children when authenticated", () => {
    const authenticatedAdmin: User = {
      id: "admin-1",
      username: "admin",
      role: "Administrador",
      isDeleted: false,
      lastModified: Date.now(),
      syncStatus: "synced",
      mustChangePassword: false,
    };

    useStore.setState({
      currentUser: null,
      isAuthenticated: true,
      isAuthLoading: false,
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/ruta-desconocida"]}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<div data-testid="login-sentinel">Login</div>} />
          <Route
            path="*"
            element={
              <ProtectedRoute requiredRoles={[]}>
                <div data-testid="protected-404-sentinel">404</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("login-sentinel")).toBeInTheDocument();
    unmount();

    act(() => {
      useStore.setState({
        currentUser: authenticatedAdmin,
        isAuthenticated: true,
        isAuthLoading: false,
      });
    });

    render(
      <MemoryRouter initialEntries={["/ruta-desconocida"]}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<div data-testid="login-sentinel">Login</div>} />
          <Route
            path="*"
            element={
              <ProtectedRoute requiredRoles={[]}>
                <div data-testid="protected-404-sentinel">404</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("protected-404-sentinel")).toBeInTheDocument();
  });
});
