// Isolated process with its own Prisma pools, against the disposable test DB only.
const { AuthService } = require("../../../src/services/AuthService.ts");
const { closeDatabase } = require("../../../src/services/db.ts");
const { assertConnectedToTestDb } = require("../../integration/_support/testDb.ts");
async function main() {
  await assertConnectedToTestDb();
  const statuses = [];
  for (let i = 0; i < 4; i++) {
    try {
      const result = await AuthService.validateMFALogin(process.env.MFA_TEST_TOKEN, "abcdef");
      statuses.push(result.success ? 200 : 401);
    } catch (error) {
      if (error.statusCode !== 429) throw error;
      statuses.push(429);
    }
  }
  process.stdout.write(JSON.stringify(statuses));
}
main()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
