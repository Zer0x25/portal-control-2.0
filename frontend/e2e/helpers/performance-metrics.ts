import type { TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface PerformanceSummary {
  sampleCount: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}

const rounded = (value: number) => Number(value.toFixed(2));

export function summarizePerformance(samples: readonly number[]): PerformanceSummary {
  if (samples.length === 0) throw new Error("Cannot summarize an empty performance sample");

  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return {
    sampleCount: sorted.length,
    medianMs: rounded(median),
    p95Ms: rounded(sorted[p95Index] ?? 0),
    maxMs: rounded(sorted[sorted.length - 1] ?? 0),
  };
}

export async function attachPerformanceReport(
  testInfo: TestInfo,
  name: string,
  report: Record<string, unknown>,
): Promise<void> {
  const body = `${JSON.stringify(report, null, 2)}\n`;
  console.info(`[PERF_RESULT] ${name} ${JSON.stringify(report)}`);
  const outputDirectory = process.env.PERFORMANCE_RESULTS_DIR;
  if (outputDirectory) {
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, path.basename(name)), body);
  }
  await testInfo.attach(name, {
    body: Buffer.from(body),
    contentType: "application/json",
  });
}
