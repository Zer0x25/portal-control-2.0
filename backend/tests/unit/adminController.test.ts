import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { diagnoseAutoClose } from "../../src/controllers/adminController";
import { getAutoCloseDiagnosis } from "../../src/services/autoCloseService";
import { errorHandler } from "../../src/middleware/errorHandler";

vi.mock("../../src/services/autoCloseService", () => ({
  getAutoCloseDiagnosis: vi.fn(),
  processAutoClosures: vi.fn(),
}));

const app = express();
app.use(express.json());

app.get("/admin/diagnose-autoclose", diagnoseAutoClose);

app.use(errorHandler);

describe("Admin Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /admin/diagnose-autoclose", () => {
    it("should return 200 and diagnosis result successfully", async () => {
      const mockResult = {
        pendingClosures: 5,
        details: ["test"],
      };

      vi.mocked(getAutoCloseDiagnosis).mockResolvedValue(mockResult as any);

      const res = await request(app).get("/admin/diagnose-autoclose");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: mockResult,
      });
      expect(getAutoCloseDiagnosis).toHaveBeenCalledTimes(1);
    });

    it("should propagate errors from getAutoCloseDiagnosis to error handler", async () => {
      const mockError = new Error("Database error");
      vi.mocked(getAutoCloseDiagnosis).mockRejectedValue(mockError);

      const res = await request(app).get("/admin/diagnose-autoclose");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(getAutoCloseDiagnosis).toHaveBeenCalledTimes(1);
    });
  });
});
