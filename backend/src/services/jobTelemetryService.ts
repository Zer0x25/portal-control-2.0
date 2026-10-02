type JobRunStatus = "SUCCESS" | "ERROR" | "SKIPPED";

type JobRunSample = {
  at: string;
  durationMs: number;
  status: JobRunStatus;
  error?: string;
};

type JobStats = {
  jobName: string;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  skippedRuns: number;
  retries: number;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  durationsMs: number[];
  samples: JobRunSample[];
};

export type JobTelemetrySnapshot = {
  generatedAt: string;
  jobs: Array<{
    jobName: string;
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    skippedRuns: number;
    retries: number;
    successRate: number;
    p95DurationMs: number | null;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
    recentSamples: JobRunSample[];
  }>;
};

const MAX_DURATION_HISTORY = Math.max(
  Number.parseInt(process.env.JOB_METRICS_MAX_DURATIONS ?? "200", 10) || 200,
  10,
);
const MAX_SAMPLE_HISTORY = Math.max(
  Number.parseInt(process.env.JOB_METRICS_MAX_SAMPLES ?? "30", 10) || 30,
  5,
);

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function computeP95(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

class JobTelemetryService {
  private readonly stats = new Map<string, JobStats>();

  private getOrCreate(jobName: string): JobStats {
    const existing = this.stats.get(jobName);
    if (existing) return existing;

    const created: JobStats = {
      jobName,
      totalRuns: 0,
      successRuns: 0,
      failedRuns: 0,
      skippedRuns: 0,
      retries: 0,
      lastRunAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastError: null,
      durationsMs: [],
      samples: [],
    };
    this.stats.set(jobName, created);
    return created;
  }

  recordRun(jobName: string, status: JobRunStatus, durationMs: number, error?: unknown) {
    const target = this.getOrCreate(jobName);
    const now = new Date().toISOString();

    target.totalRuns += 1;
    target.lastRunAt = now;
    target.durationsMs.push(Math.max(0, Math.round(durationMs)));
    if (target.durationsMs.length > MAX_DURATION_HISTORY) {
      target.durationsMs.splice(0, target.durationsMs.length - MAX_DURATION_HISTORY);
    }

    if (status === "SUCCESS") {
      target.successRuns += 1;
      target.lastSuccessAt = now;
    } else if (status === "ERROR") {
      target.failedRuns += 1;
      target.lastErrorAt = now;
      target.lastError = toErrorMessage(error);
    } else {
      target.skippedRuns += 1;
    }

    target.samples.push({
      at: now,
      durationMs: Math.max(0, Math.round(durationMs)),
      status,
      error: status === "ERROR" ? toErrorMessage(error) : undefined,
    });
    if (target.samples.length > MAX_SAMPLE_HISTORY) {
      target.samples.splice(0, target.samples.length - MAX_SAMPLE_HISTORY);
    }
  }

  recordRetry(jobName: string) {
    const target = this.getOrCreate(jobName);
    target.retries += 1;
  }

  getSnapshot(): JobTelemetrySnapshot {
    const jobs = [...this.stats.values()]
      .map((stat) => ({
        jobName: stat.jobName,
        totalRuns: stat.totalRuns,
        successRuns: stat.successRuns,
        failedRuns: stat.failedRuns,
        skippedRuns: stat.skippedRuns,
        retries: stat.retries,
        successRate:
          stat.totalRuns > 0 ? Number((stat.successRuns / stat.totalRuns).toFixed(4)) : 1,
        p95DurationMs: computeP95(stat.durationsMs),
        lastRunAt: stat.lastRunAt,
        lastSuccessAt: stat.lastSuccessAt,
        lastErrorAt: stat.lastErrorAt,
        lastError: stat.lastError,
        recentSamples: [...stat.samples],
      }))
      .sort((a, b) => a.jobName.localeCompare(b.jobName));

    return {
      generatedAt: new Date().toISOString(),
      jobs,
    };
  }
}

export const jobTelemetryService = new JobTelemetryService();
