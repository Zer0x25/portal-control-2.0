import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  io: vi.fn(),
  token: "first",
  socket: { on: vi.fn(), disconnect: vi.fn() },
}));
vi.mock("socket.io-client", () => ({ io: mocks.io }));
vi.mock("../../services/authService", () => ({ authService: { getToken: () => mocks.token } }));
import { socketService } from "../../services/socketService";
afterEach(() => {
  socketService.disconnect();
  vi.clearAllMocks();
});
it("reads the current token at each handshake, reuses one connection and closes on logout", () => {
  mocks.io.mockReturnValue(mocks.socket);
  socketService.connect();
  socketService.connect();
  expect(mocks.io).toHaveBeenCalledTimes(1);
  const options = mocks.io.mock.calls[0]![1];
  const callback = vi.fn();
  options.auth(callback);
  expect(callback).toHaveBeenLastCalledWith({ token: "first" });
  mocks.token = "renewed";
  options.auth(callback);
  expect(callback).toHaveBeenLastCalledWith({ token: "renewed" });
  expect(options.withCredentials).toBe(false);
  socketService.disconnect();
  expect(mocks.socket.disconnect).toHaveBeenCalledTimes(1);
  expect(socketService.getSocket()).toBeNull();
});
