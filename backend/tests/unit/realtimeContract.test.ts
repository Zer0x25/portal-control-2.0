import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { REALTIME_EVENTS } from "../../src/modules/realtime";
function files(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : entry.name.endsWith(".ts")
          ? [path.join(dir, entry.name)]
          : [],
    );
}
it("enumerates actual event producers and requires explicit event contracts", () => {
  const src = path.resolve(__dirname, "../../src");
  const producers = [
    ...files(path.join(src, "services")),
    ...files(path.join(src, "modules/records")),
  ];
  expect(producers.length).toBeGreaterThan(0);
  const events = producers.flatMap((file) => {
    const source = fs.readFileSync(file, "utf8");
    const broadcasts = [
      ...source.matchAll(/(?:SocketService\.(?:emit|emitToAll)|deps\.emit)\("([^"]+)"/g),
    ];
    const privateEvents = [...source.matchAll(/SocketService\.emitToUser\([^,]+,\s*"([^"]+)"/g)];
    expect(source).not.toMatch(/SocketService\.(?:getInstance|getIO)\(/);
    return [...broadcasts, ...privateEvents].map((match) => match[1]!);
  });
  expect(events.length).toBeGreaterThan(20);
  expect(events.filter((event) => !REALTIME_EVENTS.includes(event))).toEqual([]);
  expect(REALTIME_EVENTS.length).toBeGreaterThan(20);
  expect(new Set(REALTIME_EVENTS).size).toBe(REALTIME_EVENTS.length);
});
