import fs from "fs";
import path from "path";

test("WorkerPortal.view.tsx contains UI-PROTECTED header", () => {
  const p = path.resolve(__dirname, "../features/worker-portal/views/WorkerPortal.view.tsx");
  const content = fs.readFileSync(p, "utf8");
  expect(content).toContain("UI-PROTECTED");
});
