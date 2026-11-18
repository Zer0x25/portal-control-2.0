import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  state: {
    currentUser: null as { id: string; mustChangePassword?: boolean } | null,
    isAuthenticated: false,
    addToast: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
  socket: { on: vi.fn(), off: vi.fn() },
  invalidate: vi.fn(),
}));
vi.mock("../../store/useStore", () => ({
  useStore: Object.assign(
    (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
    { getState: () => mocks.state },
  ),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock("../../services/socketService", () => ({
  socketService: { connect: mocks.connect, disconnect: mocks.disconnect },
}));
import { useSocketEvents } from "../../hooks/useSocketEvents";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.currentUser = null;
  mocks.state.isAuthenticated = false;
});

it("connects after login and disconnects on logout, with no anonymous socket", async () => {
  mocks.connect.mockReturnValue(mocks.socket);
  const { rerender, unmount } = renderHook(() => useSocketEvents());
  expect(mocks.connect).not.toHaveBeenCalled();
  mocks.state.currentUser = { id: "owner" };
  mocks.state.isAuthenticated = true;
  rerender();
  await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));
  mocks.state.currentUser = null;
  mocks.state.isAuthenticated = false;
  rerender();
  expect(mocks.disconnect).toHaveBeenCalledTimes(1);
  unmount();
});

it("defers socket connection while mustChangePassword is true and connects once cleared", async () => {
  mocks.connect.mockReturnValue(mocks.socket);
  mocks.state.currentUser = { id: "forced-user", mustChangePassword: true };
  mocks.state.isAuthenticated = true;

  const { rerender, unmount } = renderHook(() => useSocketEvents());
  expect(mocks.connect).not.toHaveBeenCalled();

  mocks.state.currentUser = { id: "forced-user", mustChangePassword: false };
  rerender();
  await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));
  unmount();
});

it("ignores auth:force_logout when already unauthenticated and dispatches unauthorized when authenticated", async () => {
  mocks.connect.mockReturnValue(mocks.socket);
  mocks.state.currentUser = { id: "owner", mustChangePassword: false };
  mocks.state.isAuthenticated = true;

  const unauthorizedListener = vi.fn();
  window.addEventListener("unauthorized", unauthorizedListener);

  const { unmount } = renderHook(() => useSocketEvents());
  await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));

  const forceLogoutCall = mocks.socket.on.mock.calls.find(
    ([event]) => event === "auth:force_logout",
  );
  expect(forceLogoutCall).toBeDefined();
  const handleForcedLogout = forceLogoutCall![1] as (data: unknown) => void;

  mocks.state.isAuthenticated = false;
  handleForcedLogout({ reason: "SESSION_INVALIDATED" });
  expect(unauthorizedListener).not.toHaveBeenCalled();
  expect(mocks.state.addToast).not.toHaveBeenCalled();

  mocks.state.isAuthenticated = true;
  handleForcedLogout({ reason: "SESSION_INVALIDATED" });
  expect(unauthorizedListener).toHaveBeenCalledTimes(1);
  expect(mocks.state.addToast).toHaveBeenCalledTimes(1);

  window.removeEventListener("unauthorized", unauthorizedListener);
  unmount();
});
