import { http, HttpResponse } from "msw";
import { fixtures } from "./fixtures";

export const handlers = [
  // --- Auth ---
  http.post("*/api/auth/login", () => {
    return HttpResponse.json({
      success: true,
      token: fixtures.authToken,
      user: fixtures.mockUser,
      mustChangePassword: false,
    });
  }),

  http.post("*/api/auth/kiosk-login", () => {
    return HttpResponse.json({
      success: true,
      token: fixtures.authToken,
      user: fixtures.mockUser,
    });
  }),

  http.post("*/api/auth/logout", () => {
    return HttpResponse.json({ success: true });
  }),

  http.post("*/api/auth/mfa/validate", () => {
    return HttpResponse.json({
      success: true,
      token: fixtures.authToken,
      user: fixtures.mockUser,
    });
  }),

  http.post("*/api/auth/mfa/verify", () => {
    return HttpResponse.json({ success: true });
  }),

  http.post("*/api/auth/mfa/setup", () => {
    return HttpResponse.json({
      secret: "MOCKMFASECRET123",
      qrCodeUrl: "data:image/png;base64,mockQrCode",
    });
  }),

  // --- Users ---
  http.get("*/api/users", () => {
    return HttpResponse.json(fixtures.mockUsersList);
  }),

  http.post("*/api/users", () => {
    return HttpResponse.json(fixtures.mockUser, { status: 201 });
  }),

  http.put("*/api/users/:id", () => {
    return HttpResponse.json(fixtures.mockUser);
  }),

  http.delete("*/api/users/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Records / Attendance ---
  http.get("*/api/records", () => {
    return HttpResponse.json({
      data: [fixtures.mockTimeRecord],
      total: 1,
      page: 1,
      totalPages: 1,
    });
  }),

  http.post("*/api/records", () => {
    return HttpResponse.json(fixtures.mockTimeRecord);
  }),

  http.get("*/api/records/daily-attendance", () => {
    return HttpResponse.json(fixtures.mockDailyAttendance);
  }),

  http.post("*/api/records/punch", () => {
    return HttpResponse.json({
      success: true,
      action: "entrada",
      record: fixtures.mockTimeRecord,
      timestamp: "2026-10-21T08:00:00Z",
    });
  }),

  http.delete("*/api/records/:id", () => {
    return HttpResponse.json({
      success: true,
      message: "Registro eliminado",
    });
  }),

  // --- Shift Reports ---
  http.get("*/api/shift-reports", () => {
    return HttpResponse.json({
      success: true,
      data: fixtures.mockShiftReportsList,
    });
  }),

  http.post("*/api/shift-reports", () => {
    return HttpResponse.json({
      success: true,
      data: fixtures.mockShiftReport,
    });
  }),

  http.patch("*/api/shift-reports/:id", () => {
    return HttpResponse.json(fixtures.mockShiftReport);
  }),

  http.delete("*/api/shift-reports/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Shifts ---
  http.get("*/api/shifts/patterns", () => {
    return HttpResponse.json([fixtures.mockShiftPattern]);
  }),

  http.post("*/api/shifts/patterns", () => {
    return HttpResponse.json(fixtures.mockShiftPattern, { status: 201 });
  }),

  http.put("*/api/shifts/patterns/:id", () => {
    return HttpResponse.json(fixtures.mockShiftPattern);
  }),

  http.delete("*/api/shifts/patterns/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("*/api/shifts/assignments", () => {
    return HttpResponse.json({
      data: [fixtures.mockAssignedShift],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    });
  }),

  http.post("*/api/shifts/assignments", () => {
    return HttpResponse.json(fixtures.mockAssignedShift, { status: 201 });
  }),

  http.put("*/api/shifts/assignments/:id", () => {
    return HttpResponse.json(fixtures.mockAssignedShift);
  }),

  http.delete("*/api/shifts/assignments/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/shifts/schedule/matrix", () => {
    return HttpResponse.json({
      matrix: {},
      dates: [],
    });
  }),

  // --- Leaves ---
  http.get("*/api/leaves", () => {
    return HttpResponse.json({
      success: true,
      data: [fixtures.mockLeave],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      },
    });
  }),

  http.post("*/api/leaves", () => {
    return HttpResponse.json(
      {
        success: true,
        data: fixtures.mockLeave,
      },
      { status: 201 },
    );
  }),

  http.delete("*/api/leaves/:id", () => {
    return HttpResponse.json({
      success: true,
    });
  }),

  // --- Holidays ---
  http.get("*/api/holidays", () => {
    return HttpResponse.json([fixtures.mockHoliday]);
  }),

  http.post("*/api/holidays", () => {
    return HttpResponse.json(fixtures.mockHoliday, { status: 201 });
  }),

  http.delete("*/api/holidays/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Corrections ---
  http.get("*/api/corrections", () => {
    return HttpResponse.json({
      success: true,
      data: [fixtures.mockCorrection],
      total: 1,
    });
  }),

  http.post("*/api/corrections", () => {
    return HttpResponse.json({ success: true, id: fixtures.mockCorrection.id }, { status: 201 });
  }),

  http.patch("*/api/corrections/:id/status", () => {
    return HttpResponse.json({ success: true });
  }),

  // --- Configs ---
  http.get("*/api/configs", () => {
    return HttpResponse.json({
      [fixtures.mockConfigEntry.key]: fixtures.mockConfigEntry.value,
    });
  }),

  http.get("*/api/configs/:key", () => {
    return HttpResponse.json(fixtures.mockConfigEntry);
  }),

  http.post("*/api/configs/:key", () => {
    return HttpResponse.json({ success: true });
  }),

  http.get("*/api/configs/public/company-policy", () => {
    return HttpResponse.json(fixtures.mockCompanyPolicy);
  }),

  http.get("*/api/configs/public/brand-logo", () => {
    return HttpResponse.json(fixtures.mockBrandLogo);
  }),

  http.get("*/api/configs/validate-closure", () => {
    return HttpResponse.json({
      success: true,
      allowed: true,
      data: { allowed: true },
    });
  }),

  // --- KPIs ---
  http.post("*/api/kpis/summary", () => {
    return HttpResponse.json({
      success: true,
      data: fixtures.mockKpiSummary,
    });
  }),

  // --- Audit Logs ---
  http.get("*/api/audit-logs", () => {
    return HttpResponse.json({
      success: true,
      data: [fixtures.mockAuditLog],
      pagination: {
        total: 1,
        page: 1,
        totalPages: 1,
      },
    });
  }),

  http.post("*/api/audit-logs", () => {
    return HttpResponse.json({ success: true }, { status: 201 });
  }),

  // --- Health & Admin ---
  http.get("*/api/health", () => {
    return HttpResponse.json(fixtures.mockHealthStatus);
  }),

  http.get("*/api/admin/stats", () => {
    return HttpResponse.json(fixtures.mockAdminStats);
  }),

  // --- Scheduled Reports ---
  http.get("*/api/scheduled-reports", () => {
    return HttpResponse.json([fixtures.mockScheduledReport]);
  }),

  http.post("*/api/scheduled-reports", () => {
    return HttpResponse.json(
      { success: true, id: fixtures.mockScheduledReport.id },
      { status: 201 },
    );
  }),

  // --- Exports ---
  http.get("*/api/export/report-pdf", () => {
    return new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
      headers: { "Content-Type": "application/pdf" },
    });
  }),

  http.get("*/api/export/report-excel", () => {
    return new HttpResponse(new Uint8Array([80, 75, 3, 4]), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }),
];
