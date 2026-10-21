import { describe, it, expect } from "vitest";
import { fileToBase64 } from "./fileUtils";

describe("fileToBase64", () => {
  it("converts a File blob to base64 data url", async () => {
    const file = new File(["hello world"], "test.txt", { type: "text/plain" });
    const result = await fileToBase64(file);
    expect(result).toContain("data:text/plain;base64,");
  });
});
