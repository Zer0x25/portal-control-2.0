import { ulid } from "ulid";
import prisma from "../src/services/db";
import { MonthlyShiftService } from "../src/services/MonthlyShiftService";

const now = new Date();
const targetMonth = now.getMonth() + 1;
const targetYear = now.getFullYear();

function buildDailySchedules() {
  return Array.from({ length: 31 }).map((_, i) => {
    const day = i + 1;
    const isWeekend = day % 7 === 0 || day % 7 === 6;
    return {
      day,
      type: (isWeekend ? "off" : "work") as "off" | "work",
      startTime: isWeekend ? null : "08:00",
      endTime: isWeekend ? null : "17:00",
      hours: isWeekend ? 0 : 8,
    };
  });
}

async function setupEmployeeWithConflict() {
  const employeeId = ulid();
  await prisma.employee.create({
    data: {
      id: employeeId,
      name: `Benchmark ${employeeId.slice(-6)}`,
      rut: `B-${employeeId.slice(-8)}`,
      position: "Benchmark",
      area: "Benchmark",
      workdayType: "Normal",
      status: "Activo",
    },
  });

  const patternId = ulid();
  await prisma.shiftPattern.create({
    data: {
      id: patternId,
      name: "Benchmark Base Pattern",
      cycleLengthDays: 7,
      dailySchedules: JSON.stringify([]),
      worksOnHolidays: true,
      maxHoursPattern: 0,
    },
  });

  const monthStartIso = new Date(Date.UTC(targetYear, targetMonth - 1, 1))
    .toISOString()
    .split("T")[0];
  await prisma.assignedShift.create({
    data: {
      id: ulid(),
      employeeId,
      shiftPatternId: patternId,
      startDate: monthStartIso,
      endDate: null,
    },
  });

  return { employeeId };
}

async function runScenario(label: string, sampleSize: number) {
  const durations: number[] = [];
  const createdEmployeeIds: string[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const { employeeId } = await setupEmployeeWithConflict();
    createdEmployeeIds.push(employeeId);

    const t0 = Date.now();
    await MonthlyShiftService.createMonthlyPlan({
      employeeId,
      month: targetMonth,
      year: targetYear,
      dailySchedules: buildDailySchedules(),
      patternName: `Benchmark Monthly ${label} ${i}`,
    });
    durations.push(Date.now() - t0);
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / Math.max(1, durations.length));

  console.log(`[benchmark_monthly_plan] ${label}`, {
    sampleSize,
    conflictsPerEmployee: 1,
    avgMs: avg,
    p50Ms: p50,
    p95Ms: p95,
  });

  await prisma.assignedShift.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: createdEmployeeIds } } });
  await prisma.shiftPattern.deleteMany({ where: { name: { startsWith: "Benchmark" } } });
}

function buildLargeDailySchedules(size: number) {
  return Array.from({ length: size }).map((_, i) => {
    const day = i + 1;
    const isWeekend = day % 7 === 0 || day % 7 === 6;
    return {
      day,
      type: (isWeekend ? "off" : "work") as "off" | "work",
      startTime: isWeekend ? null : "08:00",
      endTime: isWeekend ? null : "17:00",
      hours: isWeekend ? 0 : 8,
    };
  });
}

async function runLargePayloadScenario(payloadSize: number) {
  const { employeeId } = await setupEmployeeWithConflict();
  const tPlan = Date.now();
  await MonthlyShiftService.createMonthlyPlan({
    employeeId,
    month: targetMonth,
    year: targetYear,
    dailySchedules: buildLargeDailySchedules(payloadSize),
    patternName: `Benchmark Monthly large-payload-${payloadSize}`,
  });
  const planMs = Date.now() - tPlan;

  console.log("[benchmark_monthly_plan] large_payload_single_operation", {
    payloadSize,
    createMonthlyPlanMs: planMs,
  });

  await prisma.assignedShift.deleteMany({ where: { employeeId } });
  await prisma.employee.deleteMany({ where: { id: employeeId } });
  await prisma.shiftPattern.deleteMany({ where: { name: { startsWith: "Benchmark" } } });
}

async function main() {
  await runScenario("small", 10);
  await runScenario("medium", 50);
  await runScenario("large", 100);
  await runLargePayloadScenario(10000);
}

main()
  .catch((error) => {
    console.error("[benchmark_monthly_plan] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
