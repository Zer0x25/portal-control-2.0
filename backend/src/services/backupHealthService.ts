import fs from "fs";
import path from "path";

type BackupRunState = {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

class BackupHealthService {
  private state: BackupRunState = {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastError: null,
  };

  private getBackupDir(): string {
    const configuredPath = process.env.BACKUP_PATH?.trim();
    return configuredPath
      ? path.resolve(process.cwd(), configuredPath)
      : path.join(process.cwd(), "backups");
  }

  private getStaleThresholdHours(): number {
    const value = Number.parseInt(process.env.BACKUP_STALE_HOURS ?? "", 10);
    return Number.isFinite(value) && value > 0 ? value : 26;
  }

  private getLatestBackupMtimeMs(): number | null {
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) return null;

    const files = fs
      .readdirSync(backupDir)
      .filter((name) => /^backup-pg-.*\.sql(\.gz)?$/i.test(name))
      .map((name) => path.join(backupDir, name));

    if (files.length === 0) return null;

    let latest: number | null = null;
    for (const filePath of files) {
      const mtimeMs = fs.statSync(filePath).mtimeMs;
      if (latest === null || mtimeMs > latest) {
        latest = mtimeMs;
      }
    }

    return latest;
  }

  recordSuccess() {
    const now = new Date().toISOString();
    this.state.lastAttemptAt = now;
    this.state.lastSuccessAt = now;
    this.state.lastError = null;
  }

  recordFailure(error: unknown) {
    this.state.lastAttemptAt = new Date().toISOString();
    this.state.lastError = error instanceof Error ? error.message : String(error);
  }

  getBackups() {
    const backupDir = this.getBackupDir();
    if (!fs.existsSync(backupDir)) return [];

    const files = fs
      .readdirSync(backupDir)
      .filter((name) => /^backup-pg-.*\.sql(\.gz)?$/i.test(name))
      .map((name) => {
        const filePath = path.join(backupDir, name);
        const stats = fs.statSync(filePath);
        return {
          name,
          createdAt: new Date(stats.mtimeMs).toISOString(),
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return files;
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  getStatus() {
    const latestMtimeMs = this.getLatestBackupMtimeMs();
    const staleThresholdHours = this.getStaleThresholdHours();
    const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
    const nowMs = Date.now();
    const ageMs = latestMtimeMs ? nowMs - latestMtimeMs : null;
    const stale = ageMs === null ? true : ageMs > staleThresholdMs;

    // Protection is "enabled" if scheduled backups are ON OR if we have manual files.
    const isScheduledEnabled = process.env.BACKUP_ENABLED === "true";
    const hasExistingBackups = latestMtimeMs !== null;

    let latestFileSize: string | null = null;
    if (latestMtimeMs) {
      const backupDir = this.getBackupDir();
      const files = fs
        .readdirSync(backupDir)
        .filter((name) => /^backup-pg-.*\.sql(\.gz)?$/i.test(name))
        .map((name) => path.join(backupDir, name));

      // Find the file matching the timestamp or closest to it
      // Since we just need the latest, let's re-find the latest file by mtime
      let latestFile: string | null = null;
      let maxMtime = -1;

      for (const file of files) {
        const stats = fs.statSync(file);
        if (stats.mtimeMs > maxMtime) {
          maxMtime = stats.mtimeMs;
          latestFile = file;
        }
      }

      if (latestFile) {
        const stats = fs.statSync(latestFile);
        latestFileSize = this.formatBytes(stats.size);
      }
    }

    return {
      enabled: isScheduledEnabled || hasExistingBackups,
      isScheduledEnabled,
      stale,
      staleThresholdHours,
      lastAttemptAt: this.state.lastAttemptAt,
      lastSuccessAt: this.state.lastSuccessAt,
      lastError: this.state.lastError,
      latestFileAt: latestMtimeMs ? new Date(latestMtimeMs).toISOString() : null,
      latestFileAgeHours: ageMs === null ? null : Math.round((ageMs / 3600000) * 100) / 100,
      latestFileSize,
      backupCount: hasExistingBackups ? this.getBackups().length : 0,
      mode: process.env.BACKUP_GFS_ENABLED === "true" ? "GFS (Pyramid)" : "Standard",
    };
  }
}

export const backupHealthService = new BackupHealthService();
