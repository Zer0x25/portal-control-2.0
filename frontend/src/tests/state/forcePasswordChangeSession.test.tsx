import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import { QUERY_CACHE_OWNER_KEY } from "../../lib/queryCache";
import { queryClient } from "../../lib/queryClient";
import { useStore } from "../../store/useStore";
import type { AppState } from "../../store/types";

describe("force password change session signal", () => {
  const originalState = useStore.getState();
  const originalLastUserId = localStorage.getItem(STORAGE_KEYS.LAST_LOGGED_USER_ID);
  const originalQueryCacheOwner = localStorage.getItem(QUERY_CACHE_OWNER_KEY);
  const originalSessionUser = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);

  afterEach(() => {
    useStore.setState(originalState, true);
    if (originalLastUserId === null) localStorage.removeItem(STORAGE_KEYS.LAST_LOGGED_USER_ID);
    else localStorage.setItem(STORAGE_KEYS.LAST_LOGGED_USER_ID, originalLastUserId);
    if (originalQueryCacheOwner === null) localStorage.removeItem(QUERY_CACHE_OWNER_KEY);
    else localStorage.setItem(QUERY_CACHE_OWNER_KEY, originalQueryCacheOwner);
    if (originalSessionUser === null) sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    else sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, originalSessionUser);
  });

  it("opens from login state, persists it, and clears it after password change", async () => {
    const userId = "forced-password-user";
    localStorage.setItem(STORAGE_KEYS.LAST_LOGGED_USER_ID, userId);
    useStore.setState({ initializeAppData: async () => undefined } satisfies Partial<AppState>);

    const currentUser = await useStore.getState()._handleSuccessfulLogin({
      userId,
      username: "forced-user",
      role: "Administrador",
      employeeId: "employee-1",
      mustChangePassword: true,
    });

    expect(currentUser.mustChangePassword).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER) ?? "{}")).toMatchObject({
      mustChangePassword: true,
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isForcePasswordChangeModalOpen).toBe(true);

    act(() => result.current.clearMustChangePassword());

    expect(result.current.isForcePasswordChangeModalOpen).toBe(false);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER) ?? "{}")).toMatchObject({
      mustChangePassword: false,
    });
  });

  it("defers initializeAppData when mustChangePassword is true and runs it on completeForcePasswordChange", async () => {
    const userId = "forced-defer-user";
    localStorage.setItem(STORAGE_KEYS.LAST_LOGGED_USER_ID, userId);
    const initializeSpy = vi.fn(async () => undefined);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
    useStore.setState({ initializeAppData: initializeSpy } satisfies Partial<AppState>);

    await useStore.getState()._handleSuccessfulLogin({
      userId,
      username: "forced-defer",
      role: "Usuario",
      mustChangePassword: true,
    });

    expect(useStore.getState().isInitialSync).toBe(false);
    expect(initializeSpy).not.toHaveBeenCalled();

    await act(async () => {
      await useStore.getState().completeForcePasswordChange();
    });

    expect(useStore.getState().currentUser?.mustChangePassword).toBe(false);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER) ?? "{}")).toMatchObject({
      mustChangePassword: false,
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    invalidateSpy.mockRestore();
  });
});
