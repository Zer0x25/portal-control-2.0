import { afterAll, beforeAll } from "vitest";
import prisma from "../../src/services/db";
import { assertConnectedToTestDb, resetIntegrationDb } from "./_support/testDb";

beforeAll(async () => {
  await assertConnectedToTestDb();
  await resetIntegrationDb();
}, 60000);

afterAll(async () => {
  await resetIntegrationDb();
  await prisma.$disconnect();
}, 60000);
