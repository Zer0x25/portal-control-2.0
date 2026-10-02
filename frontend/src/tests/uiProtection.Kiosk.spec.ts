import fs from "fs";
import path from "path";

test("Kiosk.view.tsx contains UI-PROTECTED header", () => {
  const p = path.resolve(__dirname, "../features/kiosk/views/Kiosk.view.tsx");
  const content = fs.readFileSync(p, "utf8");
  expect(content).toContain("UI-PROTECTED");
});
