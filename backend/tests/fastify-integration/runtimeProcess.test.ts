import { expect, it } from "vitest";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { assertConnectedToTestDb } from "../integration/_support/testDb";
import { closeDatabase } from "../../src/services/db";
import { afterAll } from "vitest";
afterAll(() => closeDatabase());
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  it(`compiled Fastify drains and exits cleanly on ${signal}`, async () => {
    await assertConnectedToTestDb();
    const reservation = net.createServer();
    await new Promise<void>((resolve) => reservation.listen(0, "127.0.0.1", resolve));
    const address = reservation.address();
    if (!address || typeof address === "string") throw new Error("No port");
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    const child = spawn(process.execPath, [path.resolve("dist/fastify/main.js")], {
      env: {
        ...process.env,
        PORT: String(address.port),
        DISABLE_HOLIDAY_AUTOSYNC: "true",
        DISABLE_INTEGRITY_AUDIT: "true",
        BACKUP_ENABLED: "false",
        SENTRY_DSN: "",
        EMAIL_HOST: "",
        EMAIL_USER: "",
        EMAIL_PASS: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const exit = new Promise<{ code: number | null; signal: string | null }>((resolve) =>
      child.once("exit", (code, signal) => resolve({ code, signal })),
    );
    let output = "";
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Boot timeout: " + output.slice(-1000))),
          10000,
        );
        child.stdout.on("data", (chunk) => {
          output += String(chunk);
          if (output.includes("Servidor candidato Fastify iniciado")) {
            clearTimeout(timeout);
            resolve();
          }
        });
        child.once("exit", (code) => {
          clearTimeout(timeout);
          reject(new Error("Early exit " + code));
        });
      });
      expect((await fetch(`http://127.0.0.1:${address.port}/api/health/ready`)).status).toBe(200);
      const contract = await (await fetch(`http://127.0.0.1:${address.port}/api-docs.json`)).json();
      expect(Object.keys(contract.paths).length).toBeGreaterThan(50);
      child.kill(signal);
      expect(await exit).toEqual({ code: 0, signal: null });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await exit;
      }
    }
  });
}
