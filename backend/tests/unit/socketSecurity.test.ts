import { createServer } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { SocketService } from "../../src/services/socketService";
const clients: WebSocket[] = [];
afterEach(async () => {
  clients.forEach((client) => client.close());
  clients.length = 0;
  await SocketService.close();
  vi.restoreAllMocks();
});
async function fixture() {
  const server = createServer();
  const authorize = vi.fn(async (tokens: string[]) => new Set(tokens));
  const authenticate = vi.fn(async (token: string) => {
    if (token !== "valid") throw new Error("private detail");
    return { id: "own", username: "owner", role: "Administrador" };
  });
  const io = SocketService.initialize(server, { authenticate, authorize, allowedOrigins: [] });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no listener");
  return {
    io,
    authorize,
    url: `ws://127.0.0.1:${address.port}/socket.io/?EIO=4&transport=websocket&userId=victim`,
  };
}
async function connect(url: string, token?: string) {
  const client = new WebSocket(url);
  clients.push(client);
  const packet = await new Promise<string>((resolve, reject) => {
    client.addEventListener("error", reject, { once: true });
    client.addEventListener("message", (event) => {
      const data = String(event.data);
      if (data.startsWith("0")) client.send("40" + JSON.stringify({ token }));
      if (data.startsWith("40") || data.startsWith("44")) resolve(data);
      if (data === "2") client.send("3");
    });
  });
  return { client, packet };
}
it("rejects absent/invalid credentials without leaking authentication details", async () => {
  const f = await fixture();
  for (const token of [undefined, "bad"]) {
    expect((await connect(f.url, token)).packet).toBe('44{"message":"Unauthorized"}');
  }
  expect(f.io.sockets.sockets.size).toBe(0);
});
it("joins only the authenticated identity and never the query victim", async () => {
  const f = await fixture();
  expect((await connect(f.url, "valid")).packet.startsWith("40")).toBe(true);
  const socket = [...f.io.sockets.sockets.values()][0]!;
  expect(socket.rooms.has("user:own")).toBe(true);
  expect(socket.rooms.has("user:victim")).toBe(false);
});
it("checks session validity before delivering and disconnects revoked clients", async () => {
  const f = await fixture();
  const { client } = await connect(f.url, "valid");
  const messages: string[] = [];
  client.addEventListener("message", (event) => messages.push(String(event.data)));
  SocketService.emitToUser("", "empty-target", { secret: 0 });
  SocketService.emitToUser("victim", "foreign-target", { secret: 0 });
  SocketService.emitToUser("own", "private", { secret: 1 });
  await vi.waitFor(() => expect(messages).toContain('42["private",{"secret":1}]'));
  expect(messages.some((packet) => packet.includes("target"))).toBe(false);
  f.authorize.mockResolvedValue(new Set());
  SocketService.emitToAll("sensitive", { secret: 2 });
  await vi.waitFor(() => expect(f.io.sockets.sockets.size).toBe(0));
  expect(messages.some((packet) => packet.includes("sensitive"))).toBe(false);
});
it("rejects unlisted origins at the Engine.IO boundary, not only CORS headers", async () => {
  const f = await fixture();
  const response = await fetch(
    f.url.replace("ws://", "http://").replace("transport=websocket", "transport=polling"),
    { headers: { Origin: "https://untrusted.invalid" } },
  );
  expect(response.status).toBe(403);
});
it("disconnects clients on authorization infrastructure failure without exposing details", async () => {
  const f = await fixture();
  await connect(f.url, "valid");
  f.authorize.mockRejectedValue(new Error("database secret"));
  SocketService.emitToAll("sensitive", { secret: 2 });
  await vi.waitFor(() => expect(f.io.sockets.sockets.size).toBe(0));
});

it("revalidates idle clients on the periodic sweep and releases its timer on close", async () => {
  const interval = vi.spyOn(globalThis, "setInterval");
  const clear = vi.spyOn(globalThis, "clearInterval");
  const f = await fixture();
  await connect(f.url, "valid");
  f.authorize.mockResolvedValue(new Set());
  const index = interval.mock.calls.findIndex((args) => args[1] === 30000);
  expect(index).toBeGreaterThanOrEqual(0);
  const callback = interval.mock.calls[index]![0];
  if (typeof callback !== "function") throw new Error("missing sweep");
  callback();
  await vi.waitFor(() => expect(f.io.sockets.sockets.size).toBe(0));
  await SocketService.close();
  expect(clear).toHaveBeenCalledWith(interval.mock.results[index]!.value);
});
