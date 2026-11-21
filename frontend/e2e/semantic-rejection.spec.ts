import { test, expect } from "@playwright/test";
import { loginFast } from "./helpers/auth-helper";

test("rechazo conserva el motivo ante error y persiste el reintento en staging", async ({
  page,
  request,
}) => {
  const api = process.env.E2E_API_URL;
  test.skip(
    api !== "http://127.0.0.1:8080/api" ||
      !["http://127.0.0.1:5199", "http://127.0.0.1:8080"].includes(
        process.env.E2E_BASE_URL || "",
      ),
    "Requiere staging local aislado",
  );
  const admin = await loginFast(page, request, "admin");
  const headers = { Authorization: `Bearer ${admin}` };
  const workerLogin = await request.post(`${api}/auth/login`, {
    data: {
      username: process.env.E2E_WORKER_USERNAME || "juan.perez",
      password: process.env.E2E_WORKER_PASSWORD || "123456",
    },
  });
  expect(workerLogin.ok()).toBeTruthy();
  const worker = await workerLogin.json();
  expect(worker.employeeId).toBeTruthy();
  const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const recordResponse = await request.post(`${api}/records`, {
    headers,
    data: {
      employeeId: worker.employeeId,
      employeeName: "E2E semántica",
      employeeArea: "E2E",
      employeeWorkdayType: "Ordinaria",
      date: day,
      entrada: `${day}T12:00:00.000Z`,
      status: "Trabajando",
      source: "MANUAL",
    },
  });
  expect(
    recordResponse.ok(),
    `crear registro: ${recordResponse.status()} ${await recordResponse.text()}`,
  ).toBeTruthy();
  const record = await recordResponse.json();
  try {
    const marker = `Prueba semántica ${Date.now()}`;
    const created = await request.post(`${api}/corrections`, {
      headers,
      data: {
        employeeId: worker.employeeId,
        timeRecordId: record.id,
        recordField: "entrada",
        requestedValue: `${day}T12:05:00.000Z`,
        reason: marker,
      },
    });
    expect(
      created.ok(),
      `crear solicitud: ${created.status()} ${await created.text()}`,
    ).toBeTruthy();
    const correction = await created.json();
    let attempts = 0;
    await page.route(`**/api/corrections/${correction.id}/status`, async (route) => {
      attempts += 1;
      if (attempts === 1)
        await route.fulfill({ status: 503, json: { message: "Servicio de prueba no disponible" } });
      else await route.continue();
    });
    await page.goto("/#/dashboard-supervisor?tab=employees");
    const card = page.locator('[data-list-group="request-queue"]').filter({ hasText: marker });
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.getByRole("button", { name: "Denegar Solicitud" }).click();
    const dialog = page.getByRole("dialog", { name: "Motivo de Rechazo" });
    const reason = dialog.getByRole("textbox", { name: /Justificación Técnica/ });
    await reason.fill("Motivo de prueba integrado");
    await dialog.getByRole("button", { name: "Confirmar Rechazo" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Servicio de prueba no disponible");
    await expect(reason).toHaveValue("Motivo de prueba integrado");
    await dialog.getByRole("button", { name: "Confirmar Rechazo" }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => attempts).toBe(2);
    const list = await request.get(`${api}/corrections?status=rejected&limit=100`, { headers });
    expect(list.ok()).toBeTruthy();
    const rows = (await list.json()).requests as Array<{ id: string; rejectionReason: string }>;
    expect(rows.find((row) => row.id === correction.id)?.rejectionReason).toBe(
      "Motivo de prueba integrado",
    );
  } finally {
    const removed = await request.delete(`${api}/records/${record.id}`, { headers });
    expect(removed.ok(), `limpiar registro: ${removed.status()}`).toBeTruthy();
  }
});
