import prisma from "./db";
import fs, { createReadStream, createWriteStream } from "fs";
import path from "path";
import os from "os";
import { logger } from "../utils/logger";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { createGzip, createGunzip } from "zlib";
import { pipeline } from "stream/promises";

const execFileAsync = promisify(execFile);

function spawnWithRedirect(
  command: string,
  args: string[],
  options: { inputFile?: string; outputFile?: string },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stdio: ("ignore" | "pipe" | number)[] = ["ignore", "ignore", "pipe"];
    let fdIn: number | undefined;
    let fdOut: number | undefined;

    try {
      if (options.inputFile) {
        fdIn = fs.openSync(options.inputFile, "r");
        stdio[0] = fdIn;
      }
      if (options.outputFile) {
        fdOut = fs.openSync(options.outputFile, "w");
        stdio[1] = fdOut;
      }
    } catch (err) {
      if (fdIn !== undefined) fs.closeSync(fdIn);
      if (fdOut !== undefined) fs.closeSync(fdOut);
      return reject(err);
    }

    const proc = spawn(command, args, { stdio });

    let stderr = "";
    if (proc.stderr) {
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
    }

    proc.on("close", (code) => {
      if (fdIn !== undefined) {
        fs.closeSync(fdIn);
        fdIn = undefined;
      }
      if (fdOut !== undefined) {
        fs.closeSync(fdOut);
        fdOut = undefined;
      }
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command ${command} failed with code ${code}. Stderr: ${stderr}`));
      }
    });

    proc.on("error", (err) => {
      if (fdIn !== undefined) {
        fs.closeSync(fdIn);
        fdIn = undefined;
      }
      if (fdOut !== undefined) {
        fs.closeSync(fdOut);
        fdOut = undefined;
      }
      reject(err);
    });
  });
}

type BackupFile = {
  name: string;
  filePath: string;
  mtimeMs: number;
};

export class BackupService {
  private backupDir: string;
  private compressEnabled: boolean;
  private backupMode: "auto" | "host" | "docker";
  private keepDaily: number;
  private keepWeekly: number;
  private keepMonthly: number;

  constructor() {
    const configuredPath = process.env.BACKUP_PATH?.trim();
    this.backupDir = configuredPath
      ? path.resolve(process.cwd(), configuredPath)
      : path.join(process.cwd(), "backups");

    this.compressEnabled = process.env.BACKUP_COMPRESS !== "false";
    this.backupMode =
      process.env.BACKUP_MODE === "host" || process.env.BACKUP_MODE === "docker"
        ? process.env.BACKUP_MODE
        : "auto";
    this.keepDaily = this.parsePositiveInt(process.env.BACKUP_KEEP_DAILY, 7);
    this.keepWeekly = this.parsePositiveInt(process.env.BACKUP_KEEP_WEEKLY, 8);
    this.keepMonthly = this.parsePositiveInt(process.env.BACKUP_KEEP_MONTHLY, 12);

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Performs a database backup based on the connection URL.
   */
  async backupDatabase(): Promise<string> {
    const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

    if (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")) {
      return this.backupPostgres(rawUrl);
    }

    logger.warn("Backup omitido: protocolo de base de datos no soportado.");
    return "not-supported";
  }

  /**
   * Performs a backup of the PostgreSQL database using pg_dump.
   */
  private async backupPostgres(url: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // Only a verified artifact becomes visible to listings/restore/retention.
    // Work directories are on the destination filesystem for atomic rename.
    const workDir = await fs.promises.mkdtemp(path.join(this.backupDir, ".backup-work-"));
    const backupPath = path.join(workDir, `backup-pg-${timestamp}.sql`);
    try {
      logger.info("Iniciando backup de PostgreSQL...");
      await this.runPgDump(url, backupPath);
      const source = this.compressEnabled ? await this.compressBackupFile(backupPath) : backupPath;
      await this.verifyBackupIntegrity(source);
      const finalPath = path.join(this.backupDir, path.basename(source));
      await fs.promises.rename(source, finalPath);
      logger.info("Backup de PostgreSQL creado y verificado", { file: path.basename(finalPath) });
      // Retention failure must not turn a successfully published backup into failure.
      try {
        this.cleanupOldBackups();
      } catch (error) {
        logger.error("No se pudo aplicar retencion de backups", error);
      }
      return finalPath;
    } catch (error) {
      logger.error("Error al realizar pg_dump o verificacion", error);
      throw error;
    } finally {
      await fs.promises.rm(workDir, { recursive: true, force: true });
    }
  }

  private async runPgDump(url: string, backupPath: string): Promise<void> {
    const pgDumpUrl = this.toPgDumpUrl(url);

    if (this.backupMode === "host") {
      await this.runPgDumpFromHost(pgDumpUrl, backupPath);
      return;
    }

    if (this.backupMode === "docker") {
      await this.runPgDumpFromDocker(pgDumpUrl, backupPath);
      return;
    }

    const hostAvailable = await this.isHostPgDumpAvailable();
    if (hostAvailable) {
      await this.runPgDumpFromHost(pgDumpUrl, backupPath);
      return;
    }

    await this.runPgDumpFromDocker(pgDumpUrl, backupPath);
  }

  private async runPgDumpFromHost(url: string, backupPath: string): Promise<void> {
    // The vulnerability (Command Injection via execAsync) was previously mitigated here,
    // we use spawnWithRedirect to pass arguments safely.
    await spawnWithRedirect("pg_dump", [url], { outputFile: backupPath });
  }

  private async runPgDumpFromDocker(url: string, backupPath: string): Promise<void> {
    const containerName = await this.resolveDockerContainerName();
    await spawnWithRedirect("docker", ["exec", containerName, "pg_dump", url], {
      outputFile: backupPath,
    });
  }

  /**
   * Restores the database from a given backup file.
   * WARNING: This drops the public schema and recreates it.
   */
  async restoreDatabase(filename: string): Promise<void> {
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename) {
      throw new Error("Invalid backup filename");
    }

    const backupPath = path.join(this.backupDir, safeFilename);

    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
    if (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")) {
      await this.restorePostgres(rawUrl, backupPath);
      return;
    }

    throw new Error("Database protocol not supported for restore");
  }

  private async restorePostgres(url: string, backupPath: string): Promise<void> {
    logger.warn(`Iniciando restauracion desde: ${backupPath}`);

    // Every attempt owns its temporary directory, including failed decompression.
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "portal-restore-"));
    try {
      let restoreSource = backupPath;
      if (backupPath.endsWith(".gz")) {
        restoreSource = path.join(tempDir, "restore.sql");
        await this.decompressFile(backupPath, restoreSource);
      }
      await this.runPsqlRestore(url, restoreSource);
      logger.info("Restauracion completada exitosamente.");
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    await pipeline(createReadStream(inputPath), createGunzip(), createWriteStream(outputPath));
  }

  private async isHostPgDumpAvailable(): Promise<boolean> {
    try {
      if (process.platform === "win32") {
        await execFileAsync("where", ["pg_dump"]);
      } else {
        await execFileAsync("which", ["pg_dump"]);
      }
      return true;
    } catch {
      return false;
    }
  }

  private async isHostPsqlAvailable(): Promise<boolean> {
    try {
      if (process.platform === "win32") {
        await execFileAsync("where", ["psql"]);
      } else {
        await execFileAsync("which", ["psql"]);
      }
      return true;
    } catch {
      return false;
    }
  }

  private async runPsqlRestore(url: string, filePath: string): Promise<void> {
    const cleanUrl = this.toPgDumpUrl(url);
    const hostAvailable = this.backupMode === "auto" && (await this.isHostPsqlAvailable());
    // -1 covers BOTH the schema replacement and the dump. ON_ERROR_STOP makes
    // any SQL/meta-command failure abort psql and roll back the entire restore.
    const restoreArgs = [
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=on",
      "--single-transaction",
      "--dbname",
      cleanUrl,
      "--command",
      "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
      "--file=-",
    ];

    if (this.backupMode === "docker" || (!hostAvailable && this.backupMode === "auto")) {
      const containerName = await this.resolveDockerContainerName();
      // We pipe the file content from HOST to DOCKER container input using spawnWithRedirect
      await spawnWithRedirect("docker", ["exec", "-i", containerName, "psql", ...restoreArgs], {
        inputFile: filePath,
      });
      return;
    }

    await spawnWithRedirect("psql", restoreArgs, { inputFile: filePath });
  }

  private toPgDumpUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete("schema");
      parsed.searchParams.delete("pgbouncer");
      parsed.searchParams.delete("connection_limit");
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private async resolveDockerContainerName(): Promise<string> {
    const configured = process.env.BACKUP_DOCKER_CONTAINER?.trim();
    if (configured) return configured;

    const { stdout } = await execFileAsync("docker", [
      "ps",
      "--filter",
      "ancestor=postgres:18.4-alpine",
      "--format",
      "{{.Names}}",
    ]);
    const containers = stdout
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (containers.length !== 1) {
      throw new Error(
        "Se requiere un unico contenedor PostgreSQL 18.4. Define BACKUP_DOCKER_CONTAINER.",
      );
    }

    return containers[0];
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private async compressBackupFile(inputPath: string): Promise<string> {
    const outputPath = `${inputPath}.gz`;
    await pipeline(createReadStream(inputPath), createGzip(), createWriteStream(outputPath));
    fs.unlinkSync(inputPath);
    return outputPath;
  }

  private async verifyBackupIntegrity(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup no encontrado para verificación: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    // 50 bytes is a very conservative minimum (file header + footer)
    if (stats.size < 50) {
      throw new Error(`Backup corrupto: Tamaño insuficiente (${stats.size} bytes).`);
    }

    // Header Check
    const handle = await fs.promises.open(filePath, "r");
    const buffer = Buffer.alloc(2);
    await handle.read(buffer, 0, 2, 0);
    await handle.close();

    if (filePath.endsWith(".gz")) {
      // GZIP Magic Number: 0x1f 0x8b
      if (buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
        throw new Error("Backup corrupto: Cabecera GZIP inválida.");
      }
    } else {
      // SQL Dump typically starts with comments "--" or PGPASSWORD etc.
      // We just ensure it's readable.
    }
  }

  private getWeekKey(date: Date): string {
    // ISO week key: YYYY-Www (UTC)
    const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  private getMonthKey(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  /**
   * Retention policy:
   * - Keep all backups from last N days (daily).
   * - Keep one newest backup per week for next M weeks.
   * - Keep one newest backup per month for next K months.
   */
  /**
   * Applies the GFS (Grandfather-Father-Son) "Pyramid" retention policy.
   * Keeps backups based on a 7-level bucket strategy.
   * 1. Daily (7)
   * 2. Weekly (6)
   * 3. Monthly (5)
   * 4. Quarterly (4)
   * 5. Semestral (3)
   * 6. Yearly (2)
   * 7. Lustrum (1)
   */
  private cleanupOldBackups() {
    if (process.env.BACKUP_GFS_ENABLED !== "true") {
      this.cleanupLegacyBackups();
      return;
    }

    const backupFiles = this.getBackupFiles();
    if (backupFiles.length === 0) return;

    // Configuration for GFS Levels
    const limits = {
      daily: this.parsePositiveInt(process.env.BACKUP_RETENTION_DAILY, 7),
      weekly: this.parsePositiveInt(process.env.BACKUP_RETENTION_WEEKLY, 6),
      monthly: this.parsePositiveInt(process.env.BACKUP_RETENTION_MONTHLY, 5),
      quarterly: this.parsePositiveInt(process.env.BACKUP_RETENTION_QUARTERLY, 4),
      semestral: this.parsePositiveInt(process.env.BACKUP_RETENTION_SEMESTRAL, 3),
      yearly: this.parsePositiveInt(process.env.BACKUP_RETENTION_YEARLY, 2),
      lustrum: this.parsePositiveInt(process.env.BACKUP_RETENTION_LUSTRUM, 1),
    };

    const keep = new Set<string>();

    // 1. Daily Bucket (Levels 1)
    // We just keep the N most recent files strictly by date.
    // This ensures we always have the last N days of history regardless of calendar alignment.
    for (let i = 0; i < Math.min(backupFiles.length, limits.daily); i++) {
      keep.add(backupFiles[i].filePath);
    }

    // For higher levels, we use a "Latest within period" strategy.
    // We iterate through all files and group them by period key (e.g., "2023-W12", "2023-01").
    // We keep the LATEST file for each period, up to the limit N.

    const processBucket = (limit: number, getKey: (date: Date) => string) => {
      const buckets = new Map<string, BackupFile>();

      for (const file of backupFiles) {
        const key = getKey(new Date(file.mtimeMs));
        // Since files are sorted descending (newest first), the first one we see for a key is the latest.
        if (!buckets.has(key)) {
          buckets.set(key, file);
        }
      }

      // Now we have the latest file for every period available in history.
      // We only keep the most recent N buckets.
      const sortedKeys = Array.from(buckets.keys()).sort().reverse().slice(0, limit);

      for (const key of sortedKeys) {
        const file = buckets.get(key);
        if (file) keep.add(file.filePath);
      }
    };

    // 2. Weekly Bucket (ISO Week)
    processBucket(limits.weekly, (date) => this.getWeekKey(date));

    // 3. Monthly Bucket (YYYY-MM)
    processBucket(limits.monthly, (date) => this.getMonthKey(date));

    // 4. Quarterly Bucket (YYYY-Q1..4)
    processBucket(limits.quarterly, (date) => {
      const q = Math.floor(date.getUTCMonth() / 3) + 1;
      return `${date.getUTCFullYear()}-Q${q}`;
    });

    // 5. Semestral Bucket (YYYY-S1..2)
    processBucket(limits.semestral, (date) => {
      const s = date.getUTCMonth() < 6 ? 1 : 2;
      return `${date.getUTCFullYear()}-S${s}`;
    });

    // 6. Yearly Bucket (YYYY)
    processBucket(limits.yearly, (date) => `${date.getUTCFullYear()}`);

    // 7. Lustrum Bucket (5-Year Blocks)
    processBucket(limits.lustrum, (date) => {
      const year = date.getUTCFullYear();
      const lustrum = Math.floor(year / 5) * 5;
      return `${lustrum}-${lustrum + 4}`;
    });

    // Execution: Delete files not marked as KEEP
    let deletedCount = 0;
    for (const file of backupFiles) {
      if (!keep.has(file.filePath)) {
        fs.unlinkSync(file.filePath);
        logger.warn(`[GFS] Backup eliminado por rotacion: ${file.name}`);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.warn(
        `[GFS] Rotacion completada. Archivos retenidos: ${keep.size}. Eliminados: ${deletedCount}`,
      );
    }
  }

  private getBackupFiles(): BackupFile[] {
    return fs
      .readdirSync(this.backupDir)
      .filter((name) => /^backup-pg-.*\.sql(\.gz)?$/i.test(name))
      .map((name) => {
        const filePath = path.join(this.backupDir, name);
        const stats = fs.statSync(filePath);
        return { name, filePath, mtimeMs: stats.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
  }

  private cleanupLegacyBackups() {
    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dailyLimitMs = this.keepDaily * dayMs;
    const weeklyLimitMs = (this.keepDaily + this.keepWeekly * 7) * dayMs;
    const monthlyLimitMs = (this.keepDaily + this.keepWeekly * 7 + this.keepMonthly * 31) * dayMs;

    const backupFiles = this.getBackupFiles();

    // Remove empty/corrupt artifacts from failed runs.
    for (const file of backupFiles) {
      const size = fs.statSync(file.filePath).size;
      if (size === 0) {
        fs.unlinkSync(file.filePath);
        logger.warn(`Backup vacio eliminado: ${file.name}`);
      }
    }

    const existingFiles = backupFiles.filter((file) => fs.existsSync(file.filePath));

    const keep = new Set<string>();
    const weeklySelected = new Set<string>();
    const monthlySelected = new Set<string>();

    for (const file of existingFiles) {
      const ageMs = nowMs - file.mtimeMs;
      const fileDate = new Date(file.mtimeMs);

      if (ageMs <= dailyLimitMs) {
        keep.add(file.filePath);
        continue;
      }

      if (ageMs <= weeklyLimitMs) {
        const weekKey = this.getWeekKey(fileDate);
        if (!weeklySelected.has(weekKey)) {
          weeklySelected.add(weekKey);
          keep.add(file.filePath);
        }
        continue;
      }

      if (ageMs <= monthlyLimitMs) {
        const monthKey = this.getMonthKey(fileDate);
        if (!monthlySelected.has(monthKey)) {
          monthlySelected.add(monthKey);
          keep.add(file.filePath);
        }
      }
    }

    for (const file of existingFiles) {
      if (!keep.has(file.filePath)) {
        fs.unlinkSync(file.filePath);
        logger.warn(`Backup eliminado por retencion: ${file.name}`);
      }
    }
  }

  /**
   * Exports all data to a JSON format (system agnostic).
   */
  async exportAllData(): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    // Every listed model only needs `findMany()`; typing the delegate keeps the
    // dynamic model access below checked without falling back to `any`.
    type ExportedModelDelegate = { findMany: (args?: object) => Promise<unknown[]> };
    const models = [
      "user",
      "employee",
      "timeRecord",
      "shiftReport",
      "auditLog",
      "shiftPattern",
      "assignedShift",
      "holiday",
      "leaveRecord",
      "correctionRequest",
      "meterReading",
      "quickNote",
      "systemConfig",
      "scheduledReport",
    ];

    for (const model of models) {
      try {
        const delegate = (prisma as unknown as Record<string, ExportedModelDelegate>)[model];
        data[model] = await delegate.findMany();
      } catch (error) {
        logger.error(`Error exporting model ${model}:`, error);
      }
    }

    return data;
  }
}

export const backupService = new BackupService();
