import { renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  state: { currentUser: null as { id: string } | null, isAuthenticated: false },
  connect: vi.fn(),
  disconnect: vi.fn(),
  socket: { on: vi.fn(), off: vi.fn() },
  invalidate: vi.fn(),
}));
vi.mock("../../store/useStore", () => ({
  useStore: (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock("../../services/socketService", () => ({
  socketService: { connect: mocks.connect, disconnect: mocks.disconnect },
}));
import { useSocketEvents } from "../../hooks/useSocketEvents";
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
