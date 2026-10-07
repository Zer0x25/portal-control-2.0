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
async function fixture(
  principals: Record<
    string,
    { id: string; username: string; role: string; employeeId?: string }
  > = { valid: { id: "own", username: "owner", role: "Administrador" } },
) {
  const server = createServer();
  const authorize = vi.fn(async (tokens: string[]) => new Set(tokens));
  const authenticate = vi.fn(async (token: string) => {
    const principal = principals[token];
    if (!principal) throw new Error("private detail");
    return principal;
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
  SocketService.emitToUser("", "user_notification", {
    title: "Empty",
    message: "Empty",
    type: "info",
  });
  SocketService.emitToUser("victim", "user_notification", {
    title: "Foreign",
    message: "Foreign",
    type: "info",
  });
  SocketService.emitToUser("own", "user_notification", {
    title: "Title",
    message: "Message",
    type: "info",
  });
  await vi.waitFor(() =>
    expect(messages).toContain(
      '42["user_notification",{"title":"Title","message":"Message","type":"info"}]',
    ),
  );
  expect(messages.some((packet) => /Empty|Foreign/.test(packet))).toBe(false);
  f.authorize.mockResolvedValue(new Set());
  SocketService.emitToAll("config:updated", { value: "secret" });
  await vi.waitFor(() => expect(f.io.sockets.sockets.size).toBe(0));
  expect(messages.some((packet) => packet.includes("config:updated"))).toBe(false);
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
  SocketService.emitToAll("config:updated", { value: "secret" });
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

it("enforces role and employee policy over real websocket frames without leaking source payloads", async () => {
  const f = await fixture({
    admin: { id: "admin", username: "admin", role: "Administrador" },
    audit: { id: "audit", username: "audit", role: "Fiscalizador" },
    worker: { id: "worker", username: "worker", role: "Usuario", employeeId: "employee" },
  });
  const received = new Map<string, string[]>();
  for (const token of ["admin", "audit", "worker"]) {
    const { client } = await connect(f.url, token);
    const frames: string[] = [];
    received.set(token, frames);
    client.addEventListener("message", (event) => frames.push(String(event.data)));
  }
  SocketService.emit("auditLog:created", { details: "sensitive-source" });
  SocketService.emit("config:updated", { value: { password: "sensitive-source" } });
  SocketService.emit("seeder:phase2_failed", { jobId: "job", error: "sensitive-source" });
  SocketService.emit("timeRecord:updated", { employeeId: "other", name: "sensitive-source" });
  SocketService.emitToUser("worker", "user_notification", {
    title: "Own",
    message: "Personal",
    type: "info",
    metadata: "sensitive-source",
  });
  SocketService.emit("unknown", { value: "sensitive-source" });
  SocketService.emit("system:maintenance", { active: false });
  await vi.waitFor(() => {
    for (const frames of received.values())
      expect(frames).toContain('42["system:maintenance",{"active":false}]');
  });
  expect(received.get("admin")).toContain('42["auditLog:created",{"changed":true}]');
  expect(received.get("audit")).toContain('42["auditLog:created",{"changed":true}]');
  expect(received.get("worker")!.some((frame) => /auditLog|seeder|timeRecord/.test(frame))).toBe(
    false,
  );
  expect(received.get("admin")).toContain('42["seeder:phase2_failed",{"jobId":"job"}]');
  expect(received.get("audit")!.some((frame) => frame.includes("seeder"))).toBe(false);
  expect(received.get("worker")).toContain(
    '42["user_notification",{"title":"Own","message":"Personal","type":"info"}]',
  );
  expect(received.get("admin")!.some((frame) => frame.includes("user_notification"))).toBe(false);
  for (const frames of received.values()) {
    expect(frames.join()).not.toContain("sensitive-source");
    expect(frames.some((frame) => frame.includes("unknown"))).toBe(false);
  }
});
