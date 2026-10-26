const { URL } = require("node:url");
const performanceRoutes = require("../performance-routes.json");

const apiBase = (process.env.E2E_API_URL || "http://127.0.0.1:8080/api").replace(/\/$/, "");
const credentialsByRole = {
  admin: {
    username: process.env.E2E_ADMIN_USERNAME || "admin",
    password: process.env.E2E_ADMIN_PASSWORD || "999.666",
  },
  worker: {
    username: process.env.E2E_WORKER_USERNAME || "juan.perez",
    password: process.env.E2E_WORKER_PASSWORD || "123456",
  },
};

const sessions = {};
let activeSession;
let targetListener;

const seedSession = ({ token, user }) => {
  sessionStorage.setItem("authToken", token);
  sessionStorage.setItem("currentUser", JSON.stringify(user));
};

const getSession = async (role) => {
  if (sessions[role]) return sessions[role];

  const response = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentialsByRole[role]),
  });
  if (!response.ok)
    throw new Error(`LHCI could not authenticate ${role} (HTTP ${response.status})`);
  const body = await response.json();
  if (body.mustChangePassword === true || typeof body.token !== "string") {
    throw new Error(`LHCI ${role} seed user cannot provide a usable session`);
  }
  sessions[role] = {
    token: body.token,
    user: {
      id: body.userId,
      username: body.username,
      role: body.role,
      employeeId: body.employeeId ?? null,
      isDeleted: false,
      lastModified: Date.now(),
      syncStatus: "synced",
    },
  };
  return sessions[role];
};

module.exports = async (browser, { url }) => {
  const targetUrl = new URL(url);
  const requestedPath = `${targetUrl.pathname}${targetUrl.hash}`;
  const route = performanceRoutes.find((candidate) => candidate.path === requestedPath);
  if (!route) throw new Error(`LHCI URL is missing from performance-routes.json: ${url}`);

  const routePath = route.currentPath;
  const session = route.role ? await getSession(route.role) : null;
  activeSession = session;

  if (!targetListener) {
    targetListener = (target) => {
      if (target.type() !== "page") return;
      void target
        .page()
        .then(async (targetPage) => {
          if (!targetPage) return;
          if (activeSession) await targetPage.evaluateOnNewDocument(seedSession, activeSession);
          await targetPage.bringToFront();
        })
        .catch(() => undefined);
    };
    browser.on("targetcreated", targetListener);
  }

  const page = await browser.newPage();
  if (session) {
    await page.evaluateOnNewDocument(seedSession, session);
  }
  // Seed before the requested document starts. Visiting the root first can
  // leave LoginPage's session-restore redirect racing this hash navigation.
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  if (session) {
    await page.waitForFunction(() => sessionStorage.getItem("currentUser") !== null);
  }
  try {
    await page.waitForFunction(
      ({ expectedPath, readiness }) => {
        if (readiness === "login") return Boolean(document.querySelector("#username"));
        if (readiness === "kiosk")
          return Boolean(document.querySelector('[data-testid="kiosk-step"]'));
        const shell = document.querySelector('[data-testid="app-shell"]');
        return Boolean(shell) && shell.getAttribute("data-current-path") === expectedPath;
      },
      { timeout: 30000 },
      { expectedPath: routePath, readiness: route.readiness },
    );
  } catch (error) {
    const observed = await page.evaluate(() => {
      let storedRole = null;
      try {
        storedRole = JSON.parse(sessionStorage.getItem("currentUser") || "null")?.role ?? null;
      } catch {}
      return {
        hash: location.hash,
        currentPath:
          document.querySelector('[data-testid="app-shell"]')?.getAttribute("data-current-path") ??
          null,
        storedRole,
        loginVisible: Boolean(document.querySelector("#username")),
      };
    });
    throw new Error(`LHCI route readiness failed for ${route.id}: ${JSON.stringify(observed)}`, {
      cause: error,
    });
  }
};
