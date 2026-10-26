const assert = require("node:assert/strict");
const { test } = require("node:test");

const createHarness = (readinessFailure = false) => {
  const navigations = [];
  const page = {
    evaluateOnNewDocument: async () => {},
    evaluate: async () => ({
      hash: "#/dashboard",
      currentPath: "/dashboard",
      storedRole: "Administrador",
      loginVisible: false,
    }),
    goto: async (url) => {
      navigations.push(url);
    },
    bringToFront: async () => {},
    waitForFunction: async (_fn, options, args) => {
      if (!args) return;
      assert.equal(options.timeout, 30000);
      assert.equal(args.expectedPath, "/admin/governance");
      if (readinessFailure) throw new Error("wrong route");
    },
  };
  delete require.cache[require.resolve("./lhci-puppeteer.cjs")];
  return {
    run: require("./lhci-puppeteer.cjs"),
    browser: { on: () => {}, newPage: async () => page },
    navigations,
  };
};
const fakeLogin = async () => ({
  ok: true,
  json: async () => ({
    token: "fake-test-session",
    userId: "test-admin",
    username: "admin",
    role: "Administrador",
  }),
});

test("authenticated setup navigates directly to its target without racing root login redirect", async (t) => {
  t.mock.method(globalThis, "fetch", fakeLogin);
  const h = createHarness();
  const url = "http://127.0.0.1:8080/#/admin/governance?tab=audit";
  await h.run(h.browser, { url });
  assert.deepEqual(h.navigations, [url]);
});

test("wrong destination remains a failure with safe diagnostics", async (t) => {
  t.mock.method(globalThis, "fetch", fakeLogin);
  const h = createHarness(true);
  await assert.rejects(
    h.run(h.browser, { url: "http://127.0.0.1:8080/#/admin/governance?tab=audit" }),
    (error) => {
      assert.match(error.message, /route readiness failed/);
      assert.match(error.message, /currentPath/);
      assert.doesNotMatch(error.message, /fake-test-session/);
      return true;
    },
  );
});
