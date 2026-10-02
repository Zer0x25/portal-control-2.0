import fs from "fs";
import path from "path";
import process from "process";

type OutputFormat = "json" | "txt";
type ProfileName = "smoke" | "medium" | "high";

type ProfileConfig = {
  employees: number;
  days: number;
  workers: number;
  batchSize: number;
  delayMs: number;
  rampUp: number;
  partialFlowRatio: number;
};

type CliConfig = {
  baseUrl: string;
  username: string;
  password: string;
  employees: number;
  days: number;
  workers: number;
  batchSize: number;
  delayMs: number;
  rampUp: number;
  partialFlowRatio: number;
  verifyIntegrity: boolean;
  output: OutputFormat;
  profile?: ProfileName;
};

type EmployeeLike = { id: string; status?: string };

type PunchOutcome = {
  ok: boolean;
  status: number;
  latencyMs: number;
  action?: string;
  error?: string;
  employeeId: string;
};

type RunSummary = {
  successRate: number;
  errorRate: number;
  reqPerSec: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  p50: number;
  p95: number;
  p99: number;
  statusCodes: Record<string, number>;
  actionCounts: Record<string, number>;
  integrityBrokenCount: number;
  integrityCheckedCount: number;
  profile?: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
};

const DEFAULTS: CliConfig = {
  baseUrl: "http://localhost:4000/api",
  username: "admin",
  password: "123456",
  employees: 20,
  days: 2,
  workers: 4,
  batchSize: 20,
  delayMs: 100,
  rampUp: 2,
  partialFlowRatio: 0.05,
  verifyIntegrity: true,
  output: "txt",
};

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return fallback;
}

function parseArgMap(argv: string[]) {
  const map: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      map[token.slice(2)] = "true";
      continue;
    }
    map[token.slice(2)] = next;
    i += 1;
  }
  return map;
}

function loadProfiles(): Record<ProfileName, ProfileConfig> {
  const profilesPath = path.join(__dirname, "stress_profiles.json");
  const content = fs.readFileSync(profilesPath, "utf8");
  return JSON.parse(content) as Record<ProfileName, ProfileConfig>;
}

function parseConfig(): CliConfig {
  const args = parseArgMap(process.argv);
  const profiles = loadProfiles();
  const profile = args.profile as ProfileName | undefined;
  const profileConfig = profile ? profiles[profile] : undefined;

  const merged = {
    ...DEFAULTS,
    ...(profileConfig || {}),
  };

  const config: CliConfig = {
    ...merged,
    profile,
    baseUrl: args.baseUrl || merged.baseUrl,
    username: args.username || merged.username,
    password: args.password || merged.password,
    employees: Number(args.employees || merged.employees),
    days: Number(args.days || merged.days),
    workers: Number(args.workers || merged.workers),
    batchSize: Number(args.batchSize || merged.batchSize),
    delayMs: Number(args.delayMs || merged.delayMs),
    rampUp: Number(args.rampUp || merged.rampUp),
    partialFlowRatio: Number(args.partialFlowRatio || merged.partialFlowRatio),
    verifyIntegrity: parseBool(args.verifyIntegrity, merged.verifyIntegrity),
    output: (args.output as OutputFormat) || merged.output,
  };

  if (!Number.isFinite(config.employees) || config.employees <= 0) {
    throw new Error("Invalid --employees value");
  }
  if (!Number.isFinite(config.days) || config.days <= 0) {
    throw new Error("Invalid --days value");
  }
  if (!Number.isFinite(config.workers) || config.workers <= 0) {
    throw new Error("Invalid --workers value");
  }
  if (!Number.isFinite(config.batchSize) || config.batchSize <= 0) {
    throw new Error("Invalid --batchSize value");
  }
  if (!Number.isFinite(config.delayMs) || config.delayMs < 0) {
    throw new Error("Invalid --delayMs value");
  }
  if (!Number.isFinite(config.rampUp) || config.rampUp < 0) {
    throw new Error("Invalid --rampUp value");
  }
  if (
    !Number.isFinite(config.partialFlowRatio) ||
    config.partialFlowRatio < 0 ||
    config.partialFlowRatio > 1
  ) {
    throw new Error("Invalid --partialFlowRatio value (0..1)");
  }
  if (config.output !== "json" && config.output !== "txt") {
    throw new Error("Invalid --output value. Use json|txt");
  }

  return config;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(baseUrl: string, username: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = (await response.json()) as { token?: string; message?: string };
  if (!response.ok || !data.token) {
    throw new Error(data.message || `Login failed (HTTP ${response.status})`);
  }
  return data.token;
}

async function fetchEmployees(
  baseUrl: string,
  token: string,
  targetCount: number,
): Promise<EmployeeLike[]> {
  const response = await fetch(
    `${baseUrl}/employees?page=1&pageSize=${Math.max(100, targetCount * 2)}&status=Activo`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || `Failed to fetch employees (HTTP ${response.status})`);
  }

  const records = (Array.isArray(data) ? data : data.data || []) as EmployeeLike[];
  const active = records.filter((e) => !e.status || e.status === "Activo");
  return active.slice(0, targetCount);
}

async function punch(baseUrl: string, token: string, employeeId: string): Promise<PunchOutcome> {
  const started = Date.now();
  let response: Response | null = null;
  let payload: any = null;
  try {
    response = await fetch(`${baseUrl}/records/punch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ employeeId }),
    });
    payload = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - started,
      action: payload?.action,
      employeeId,
      error: response.ok ? undefined : payload?.message || "Unknown error",
    };
  } catch (error: any) {
    return {
      ok: false,
      status: response?.status || 0,
      latencyMs: Date.now() - started,
      employeeId,
      error: error?.message || "Network error",
    };
  }
}

async function verifyIntegrity(
  baseUrl: string,
  token: string,
): Promise<{ checked: number; broken: number }> {
  const response = await fetch(`${baseUrl}/records/integrity/verify?limit=5000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || `Integrity verify failed (HTTP ${response.status})`);
  }
  return {
    checked: Number(data?.summary?.checkedCount || 0),
    broken: Number(data?.summary?.brokenCount || 0),
  };
}

function buildTaskPlan(employeeIds: string[], days: number, partialFlowRatio: number): string[] {
  const tasks: string[] = [];
  for (const employeeId of employeeIds) {
    for (let i = 0; i < days; i += 1) {
      const partialFlow = Math.random() < partialFlowRatio;
      tasks.push(employeeId); // entrada
      tasks.push(employeeId); // inicio colacion
      if (!partialFlow) tasks.push(employeeId); // fin colacion
      tasks.push(employeeId); // salida
    }
  }
  return tasks;
}

async function run() {
  const config = parseConfig();
  const startedAt = new Date();
  console.log(`[stress] Starting run (${config.profile || "custom"}) against ${config.baseUrl}`);

  const token = await login(config.baseUrl, config.username, config.password);
  const employees = await fetchEmployees(config.baseUrl, token, config.employees);
  if (employees.length === 0) {
    throw new Error("No active employees available for stress run");
  }

  const employeeIds = employees.map((e) => e.id);
  const tasks = buildTaskPlan(employeeIds, config.days, config.partialFlowRatio);
  const outcomes: PunchOutcome[] = [];
  const batches: string[][] = [];
  for (let i = 0; i < tasks.length; i += config.batchSize) {
    batches.push(tasks.slice(i, i + config.batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    let cursor = 0;
    async function workerLoop(workerId: number) {
      if (config.rampUp > 0 && batchIndex === 0) {
        const offsetMs = Math.floor((config.rampUp * 1000 * workerId) / config.workers);
        await sleep(offsetMs);
      }
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= batch.length) return;
        const employeeId = batch[index];
        const outcome = await punch(config.baseUrl, token, employeeId);
        outcomes.push(outcome);
        if (config.delayMs > 0) {
          await sleep(config.delayMs);
        }
      }
    }

    await Promise.all(Array.from({ length: config.workers }, (_, i) => workerLoop(i)));
  }
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();

  const latencies = outcomes.map((o) => o.latencyMs);
  const successCount = outcomes.filter((o) => o.ok).length;
  const failureCount = outcomes.length - successCount;
  const statusCodes: Record<string, number> = {};
  const actionCounts: Record<string, number> = {};
  for (const outcome of outcomes) {
    const codeKey = String(outcome.status || 0);
    statusCodes[codeKey] = (statusCodes[codeKey] || 0) + 1;
    if (outcome.action) actionCounts[outcome.action] = (actionCounts[outcome.action] || 0) + 1;
  }

  let integrityCheckedCount = 0;
  let integrityBrokenCount = 0;
  if (config.verifyIntegrity) {
    const integrity = await verifyIntegrity(config.baseUrl, token);
    integrityCheckedCount = integrity.checked;
    integrityBrokenCount = integrity.broken;
  }

  const summary: RunSummary = {
    successRate: outcomes.length ? Number(((successCount / outcomes.length) * 100).toFixed(2)) : 0,
    errorRate: outcomes.length ? Number(((failureCount / outcomes.length) * 100).toFixed(2)) : 0,
    reqPerSec: durationMs > 0 ? Number(((outcomes.length * 1000) / durationMs).toFixed(2)) : 0,
    totalRequests: outcomes.length,
    successCount,
    failureCount,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    statusCodes,
    actionCounts,
    integrityBrokenCount,
    integrityCheckedCount,
    profile: config.profile,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs,
  };

  if (config.output === "json") {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log("=== Stress Summary ===");
    console.log(`profile: ${summary.profile || "custom"}`);
    console.log(`requests: ${summary.totalRequests}`);
    console.log(`successRate: ${summary.successRate}%`);
    console.log(`errorRate: ${summary.errorRate}%`);
    console.log(`req/s: ${summary.reqPerSec}`);
    console.log(`latency p50/p95/p99: ${summary.p50}/${summary.p95}/${summary.p99} ms`);
    console.log(`statusCodes: ${JSON.stringify(summary.statusCodes)}`);
    console.log(`actionCounts: ${JSON.stringify(summary.actionCounts)}`);
    if (config.verifyIntegrity) {
      console.log(
        `integrity checked/broken: ${summary.integrityCheckedCount}/${summary.integrityBrokenCount}`,
      );
    }
  }

  const hasServerError = Object.keys(statusCodes).some(
    (code) => Number(code) >= 500 && statusCodes[code] > 0,
  );
  if (hasServerError) {
    process.exitCode = 2;
    return;
  }
  if (config.verifyIntegrity && integrityBrokenCount > 0) {
    process.exitCode = 3;
    return;
  }
  process.exitCode = 0;
}

run().catch((error) => {
  console.error("[stress] Failed:", error);
  process.exitCode = 1;
});
