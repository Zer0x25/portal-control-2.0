import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { Client } from "pg";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { BackupService } from "../../src/services/backupService";
import { assertConnectedToTestDb } from "../integration/_support/testDb";

// Separate database in the owned container; never restores the application DB.
let admin: Client;
let target: Client;
let directory: string;
let service: BackupService;
const keys = ["BACKUP_PATH", "BACKUP_MODE", "BACKUP_COMPRESS", "BACKUP_KEEP_DAILY", "DIRECT_URL"];
const saved = { ...process.env };
let restoreTemps: string[];
const listRestoreTemps = async () =>
  (await fs.readdir(os.tmpdir())).filter((name) => name.startsWith("portal-restore-")).sort();
beforeAll(async () => {
  await assertConnectedToTestDb();
  restoreTemps = await listRestoreTemps();
  if (!process.env.BACKUP_DOCKER_CONTAINER) throw new Error("Owned container required");
  const url = new URL(process.env.TEST_DIRECT_URL!);
  admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query('CREATE DATABASE "pweb3_restore_test"');
  url.pathname = "/pweb3_restore_test";
  target = new Client({ connectionString: url.toString() });
  await target.connect();
  await target.query("CREATE SCHEMA portal_runtime");
  await target.query("CREATE TABLE portal_runtime.live_claim (id int PRIMARY KEY)");
  await target.query("INSERT INTO portal_runtime.live_claim VALUES (1)");
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "portal-backup-test-"));
  process.env.BACKUP_PATH = directory;
  process.env.BACKUP_MODE = "docker";
  process.env.BACKUP_COMPRESS = "false";
  process.env.BACKUP_KEEP_DAILY = "7";
  // The subprocess runs inside the harness-owned container.
  url.hostname = "127.0.0.1";
  url.port = "5432";
  process.env.DIRECT_URL = url.toString();
  service = new BackupService();
});
afterEach(async () => {
  vi.restoreAllMocks();
  expect((await fs.readdir(directory)).filter((name) => name.startsWith(".backup-work-"))).toEqual(
    [],
  );
  expect(await listRestoreTemps()).toEqual(restoreTemps);
  expect((await target.query("SELECT id FROM portal_runtime.live_claim")).rows).toEqual([
    { id: 1 },
  ]);
});
afterAll(async () => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  await target?.end();
  if (admin) {
    await admin.query('DROP DATABASE IF EXISTS "pweb3_restore_test" WITH (FORCE)');
    await admin.end();
  }
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});
it("restores pg_dump and rolls back schema replacement after a later SQL error", async () => {
  await target.query("CREATE TABLE restore_probe (id integer PRIMARY KEY, value text NOT NULL)");
  await target.query("INSERT INTO restore_probe VALUES (1, 'original')");
  const backup = await service.backupDatabase();
  await target.query("UPDATE restore_probe SET value = 'changed'");
  await service.restoreDatabase(path.basename(backup));
  expect((await target.query("SELECT value FROM restore_probe")).rows).toEqual([
    { value: "original" },
  ]);
  await fs.writeFile(
    path.join(directory, "broken.sql"),
    "CREATE TABLE partial_restore (id int); INSERT INTO partial_restore VALUES (1); SELECT * FROM absent_restore_table;",
  );
  await expect(service.restoreDatabase("broken.sql")).rejects.toThrow("failed");
  expect((await target.query("SELECT value FROM restore_probe")).rows).toEqual([
    { value: "original" },
  ]);
  expect(
    (await target.query("SELECT to_regclass('public.partial_restore') AS name")).rows[0].name,
  ).toBeNull();
});
it("restores gzip without overwriting a sibling backup and preserves data on decompression failure", async () => {
  const sibling = path.join(directory, "compressed.sql");
  await fs.writeFile(sibling, "preserve this unrelated backup");
  await fs.writeFile(
    `${sibling}.gz`,
    gzipSync("CREATE TABLE gzip_probe (id int); INSERT INTO gzip_probe VALUES (7);"),
  );
  await service.restoreDatabase("compressed.sql.gz");
  expect((await target.query("SELECT id FROM gzip_probe")).rows).toEqual([{ id: 7 }]);
  expect(await fs.readFile(sibling, "utf8")).toBe("preserve this unrelated backup");
  await fs.writeFile(`${sibling}.gz`, Buffer.from("invalid gzip"));
  await expect(service.restoreDatabase("compressed.sql.gz")).rejects.toThrow();
  expect((await target.query("SELECT id FROM gzip_probe")).rows).toEqual([{ id: 7 }]);
  expect(await fs.readFile(sibling, "utf8")).toBe("preserve this unrelated backup");
});

it("removes unpublished artifacts after pg_dump failure", async () => {
  const url = process.env.DIRECT_URL!;
  const invalid = new URL(url);
  invalid.pathname = "/missing_backup_database";
  const before = (await fs.readdir(directory)).sort();
  process.env.DIRECT_URL = invalid.toString();
  try {
    await expect(service.backupDatabase()).rejects.toThrow("failed");
    expect((await fs.readdir(directory)).sort()).toEqual(before);
  } finally {
    process.env.DIRECT_URL = url;
  }
});
it("publishes a verified compressed backup even when retention fails", async () => {
  await target.query("CREATE TABLE retention_probe (id int)");
  await target.query("INSERT INTO retention_probe VALUES (11)");
  process.env.BACKUP_COMPRESS = "true";
  const compressedService = new BackupService();
  process.env.BACKUP_COMPRESS = "false";
  vi.spyOn(fsSync, "readdirSync").mockImplementationOnce(() => {
    throw new Error("retention unavailable");
  });
  const backup = await compressedService.backupDatabase();
  expect(backup.endsWith(".sql.gz")).toBe(true);
  expect((await fs.stat(backup)).size).toBeGreaterThan(50);
  await target.query("DROP TABLE retention_probe");
  await compressedService.restoreDatabase(path.basename(backup));
  expect((await target.query("SELECT id FROM retention_probe")).rows).toEqual([{ id: 11 }]);
});
