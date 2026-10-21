import React from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { useNavigationLoading } from "../../hooks/useNavigationLoading";
import { useStore } from "../../store/useStore";

/**
 * Spec 034, T18 (AC6): la barra de navegacion se acopla al estado real de las
 * queries activas en vez de un `setTimeout` fijo de 400 ms.
 */
describe("useNavigationLoading acoplado a las queries (spec 034 T18)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({ isGlobalLoading: false, loadingProgress: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    useStore.setState({ isGlobalLoading: false, loadingProgress: 0 });
  });

  const setup = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    let resolveQuery: (value: string) => void = () => {};
    const pending = new Promise<string>((resolve) => {
      resolveQuery = resolve;
    });

    // Query en vuelo: `useIsFetching` la cuenta como activa.
    void queryClient.fetchQuery({ queryKey: ["nav", "pending"], queryFn: () => pending });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard"]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );

    return { queryClient, wrapper, resolve: resolveQuery };
  };

  it("mantiene la barra visible mientras hay una query en vuelo (el timeout fijo de 400 ms la cerraba)", async () => {
    const { wrapper } = setup();

    renderHook(() => useNavigationLoading(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(useStore.getState().isGlobalLoading).toBe(true);
  });

  it("cierra la barra cuando la query termina", async () => {
    const { wrapper, resolve } = setup();

    renderHook(() => useNavigationLoading(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(useStore.getState().isGlobalLoading).toBe(true);

    await act(async () => {
      resolve("ok");
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(useStore.getState().isGlobalLoading).toBe(false);
  });

  it("aplica el piso perceptual cuando no hay ninguna query en vuelo", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/dashboard"]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );

    renderHook(() => useNavigationLoading(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    // El piso perceptual mantiene la barra los primeros 200 ms.
    expect(useStore.getState().isGlobalLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(useStore.getState().isGlobalLoading).toBe(false);
  });
});
