import fs from "fs";
import path from "path";

test("TimeControl.view.tsx contains UI-PROTECTED header", () => {
  const p = path.resolve(__dirname, "../features/time-control/views/TimeControl.view.tsx");
  const content = fs.readFileSync(p, "utf8");
  expect(content).toContain("UI-PROTECTED");
});
