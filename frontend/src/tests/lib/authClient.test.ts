import { describe, it, expect } from "vitest";
import { authClient } from "../../lib/authClient";

describe("authClient", () => {
  it("expone signIn y useSession", () => {
    expect(authClient.signIn.email).toBeDefined();
    expect(authClient.useSession).toBeDefined();
  });
});
