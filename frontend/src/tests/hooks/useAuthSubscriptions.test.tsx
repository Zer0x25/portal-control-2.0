import { act, renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../../hooks/useAuth";
import { useStore } from "../../store/useStore";
import type { User } from "../../types/user";

describe("useAuth store subscription", () => {
  const originalState = useStore.getState();

  afterEach(() => {
    useStore.setState(originalState, true);
    vi.restoreAllMocks();
  });

  it("subscribes once and keeps auth fields reactive", () => {
    const useSyncExternalStore = vi.spyOn(React, "useSyncExternalStore");
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useAuth();
    });
    const authStoreSubscriptions = useSyncExternalStore.mock.calls.filter(
      ([subscribe]) => subscribe === useStore.subscribe,
    );

    expect(authStoreSubscriptions).toHaveLength(1);
    expect(result.current.currentUser).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      useStore.setState({
        currentUser: {
          id: "auth-user",
          username: "admin",
          role: "Administrador",
          lastModified: Date.now(),
          syncStatus: "synced",
          isDeleted: false,
          mustChangePassword: true,
        } satisfies User,
        isAuthenticated: true,
        isAuthLoading: false,
      });
    });

    expect(result.current.currentUser?.id).toBe("auth-user");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isForcePasswordChangeModalOpen).toBe(true);

    const rendersBeforeUnrelatedUpdate = renderCount;
    act(() => {
      useStore.setState({ theme: useStore.getState().theme === "dark" ? "light" : "dark" });
    });

    expect(renderCount).toBe(rendersBeforeUnrelatedUpdate);

    act(() => {
      useStore.getState().clearMustChangePassword();
    });

    expect(result.current.isForcePasswordChangeModalOpen).toBe(false);
  });
});
