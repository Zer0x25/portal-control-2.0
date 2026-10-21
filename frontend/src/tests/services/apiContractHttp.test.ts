import { describe, expect, it, vi, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { apiClient, ApiHttpError } from "../../services/apiClient";
import { timeRecordService } from "../../services/timeRecordService";
import { shiftReportService } from "../../services/shiftReportService";

describe("HTTP Service Contract Verification (AC3)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("produces ApiHttpError with status === 401 on unauthorized response", async () => {
    server.use(
      http.get("*/api/users", () => {
        return HttpResponse.json({ message: "Sesión expirada" }, { status: 401 });
      }),
    );

    let capturedError: ApiHttpError | null = null;
    try {
      await apiClient.get("/api/users");
    } catch (err) {
      if (err instanceof ApiHttpError) {
        capturedError = err;
      }
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError?.status).toBe(401);
    expect(capturedError?.message).toBe("Sesión expirada");
  });

  it("produces clean void/empty body on 204 No Content", async () => {
    server.use(
      http.delete("*/api/shift-reports/:id", () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(shiftReportService.delete("rep-999")).resolves.toBeUndefined();
  });

  it("produces typed ApiHttpError on non-JSON / malformed server error response", async () => {
    server.use(
      http.get("*/api/records", () => {
        return new HttpResponse("<html><body>502 Bad Gateway</body></html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        });
      }),
    );

    let capturedError: ApiHttpError | null = null;
    try {
      await timeRecordService.getAll();
    } catch (err) {
      if (err instanceof ApiHttpError) {
        capturedError = err;
      }
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError?.status).toBe(502);
  });

  it("preserves exact numeric status and message for business validation 400/409 errors", async () => {
    server.use(
      http.post("*/api/records/punch", () => {
        return HttpResponse.json(
          { message: "Turno no asignado para esta fecha", code: "NO_SHIFT" },
          { status: 400 },
        );
      }),
    );

    let capturedError: ApiHttpError | null = null;
    try {
      await timeRecordService.punch("emp-1");
    } catch (err) {
      if (err instanceof ApiHttpError) {
        capturedError = err;
      }
    }

    expect(capturedError).not.toBeNull();
    expect(capturedError?.status).toBe(400);
    expect(capturedError?.message).toBe("Turno no asignado para esta fecha");
  });
});
