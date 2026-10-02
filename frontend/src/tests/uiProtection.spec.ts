import fs from "fs";
import path from "path";

test("Dashboard.view.tsx contains UI-PROTECTED header", () => {
  const p = path.resolve(__dirname, "../features/dashboard/views/Dashboard.view.tsx");
  const content = fs.readFileSync(p, "utf8");
  expect(content).toContain("UI-PROTECTED");
});
