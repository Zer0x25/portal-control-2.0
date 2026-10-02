import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("Swagger Generated Contract", () => {
  it("generated swagger.json should match snapshot", () => {
    const swaggerPath = path.join(__dirname, "../docs/swagger.json");
    const content = fs.readFileSync(swaggerPath, "utf8");
    const parsed = JSON.parse(content);

    expect(parsed).toMatchSnapshot();
  });
});
