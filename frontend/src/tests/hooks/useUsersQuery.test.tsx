import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useUsersQuery } from "../../hooks/queries/useUsersQuery";
import { useUsers } from "../../hooks/useUsers";
import { authTokenStore } from "../../services/authToken";
import { useStore } from "../../store/useStore";
import type { User, UserRole } from "../../types";
import { TEST_API_URL } from "../mocks/baseUrl";
import { recordRequests, type RequestRecorder } from "../mocks/requests";
import { server } from "../mocks/server";

const buildUser = (role: UserRole, mustChangePassword = false): User => ({
  id: `user-${role}`,
  username: `user-${role.toLowerCase()}`,
  role,
  mustChangePassword,
  isDeleted: false,
  lastModified: 0,
  syncStatus: "synced",
});

describe("useUsersQuery role and session gating", () => {
  const originalState = useStore.getState();
  let client: QueryClient;
  let recorder: RequestRecorder;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    authTokenStore.setToken("test-token");
    recorder = recordRequests();
    server.use(
      http.get(`${TEST_API_URL}/users`, () =>
        HttpResponse.json([
          buildUser("Super_Administrador"),
          { ...buildUser("Usuario"), id: "deleted-user", isDeleted: true },
        ]),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    recorder.stop();
    authTokenStore.removeToken();
    useStore.setState(originalState, true);
    client.clear();
  });

  it.each(["Reloj_Control", "Usuario", "Supervisor", "Fiscalizador", "Archivado"] as const)(
    "no ejecuta GET /api/users para rol sin permiso (%s)",
    (role) => {
      useStore.setState({ currentUser: buildUser(role), isAuthenticated: true });

      const { result } = renderHook(() => useUsersQuery(), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(result.current.data).toBeUndefined();
      expect(recorder.countOf("GET", "/api/users")).toBe(0);
    },
  );

  it.each(["Super_Administrador", "Administrador"] as const)(
    "ejecuta GET /api/users y filtra eliminados para rol autorizado (%s)",
    async (role) => {
      useStore.setState({ currentUser: buildUser(role), isAuthenticated: true });

      const { result } = renderHook(() => useUsersQuery(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(recorder.countOf("GET", "/api/users")).toBe(1);
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0]?.id).toBe("user-Super_Administrador");
    },
  );

  it("no ejecuta GET /api/users sin usuario en sesión", () => {
    useStore.setState({ currentUser: null, isAuthenticated: false });

    const { result } = renderHook(() => useUsersQuery(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(recorder.countOf("GET", "/api/users")).toBe(0);
  });

  it("no ejecuta GET /api/users cuando mustChangePassword es true", () => {
    useStore.setState({
      currentUser: buildUser("Super_Administrador", true),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useUsersQuery(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(recorder.countOf("GET", "/api/users")).toBe(0);
  });

  it("no ejecuta GET /api/users cuando options.enabled es false", () => {
    useStore.setState({
      currentUser: buildUser("Super_Administrador", false),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useUsersQuery({ enabled: false }), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(recorder.countOf("GET", "/api/users")).toBe(0);
  });

  it("no ejecuta GET /api/users sin token de sesión", () => {
    authTokenStore.removeToken();
    useStore.setState({
      currentUser: buildUser("Super_Administrador", false),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => useUsersQuery(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(recorder.countOf("GET", "/api/users")).toBe(0);
  });

  it("useUsers devuelve users=[] y isLoadingUsers=false sin disparar GET /api/users para Reloj_Control", () => {
    useStore.setState({ currentUser: buildUser("Reloj_Control"), isAuthenticated: true });

    const { result } = renderHook(() => useUsers(), { wrapper });

    expect(result.current.users).toEqual([]);
    expect(result.current.isLoadingUsers).toBe(false);
    expect(recorder.countOf("GET", "/api/users")).toBe(0);
  });
});
