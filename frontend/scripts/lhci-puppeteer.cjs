const { URL } = require("node:url");

const apiBase = (process.env.E2E_API_URL || "http://127.0.0.1:8080/api").replace(/\/$/, "");
const credentials = {
  username: process.env.E2E_ADMIN_USERNAME || "admin",
  password: process.env.E2E_ADMIN_PASSWORD || "999.666",
};

let session;
let targetListener;

const seedSession = ({ token, user }) => {
  sessionStorage.setItem("authToken", token);
  sessionStorage.setItem("currentUser", JSON.stringify(user));
};

module.exports = async (browser, { url }) => {
  if (!session) {
    const response = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error(`LHCI could not authenticate (HTTP ${response.status})`);
    const body = await response.json();
    if (body.mustChangePassword === true || typeof body.token !== "string") {
      throw new Error("LHCI seed user cannot provide a usable session");
    }
    session = {
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
  }

  if (!targetListener) {
    targetListener = (target) => {
      if (target.type() !== "page") return;
      void target
        .page()
        .then(async (targetPage) => {
          if (!targetPage) return;
          await targetPage.evaluateOnNewDocument(seedSession, session);
          await targetPage.bringToFront();
        })
        .catch(() => undefined);
    };
    browser.on("targetcreated", targetListener);
  }

  const page = await browser.newPage();
  const origin = new URL(url).origin;
  await page.evaluateOnNewDocument(seedSession, session);
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.evaluate(seedSession, session);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.bringToFront();
  await page.waitForFunction(() => sessionStorage.getItem("currentUser") !== null);
};
