import { describe, expect, it, vi, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { fixtures } from "../mocks/fixtures";
import { userService } from "../../services/userService";
import { shiftService } from "../../services/shiftService";
import { timeRecordService } from "../../services/timeRecordService";
import { leaveService } from "../../services/leaveService";
import { ApiHttpError } from "../../services/apiClient";

describe("Services HTTP Contract with MSW (AC3)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Status 401 Handling & ApiHttpError propagation", () => {
    it("userService.getAll throws ApiHttpError with status === 401 on unauthorized response", async () => {
      server.use(
        http.get("*/api/users", () => {
          return HttpResponse.json({ message: "No autorizado" }, { status: 401 });
        }),
      );

      const eventListener = vi.fn();
      window.addEventListener("unauthorized", eventListener);

      try {
        await userService.getAll();
        expect.unreachable("Should have thrown ApiHttpError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiHttpError);
        const apiErr = err as ApiHttpError;
        expect(apiErr.status).toBe(401);
        expect(apiErr.message).toBe("No autorizado");
      }

      expect(eventListener).toHaveBeenCalled();
      window.removeEventListener("unauthorized", eventListener);
    });

    it("timeRecordService.getAll throws ApiHttpError with status === 401", async () => {
      server.use(
        http.get("*/api/records", () => {
          return HttpResponse.json({ message: "Token expirado" }, { status: 401 });
        }),
      );

      try {
        await timeRecordService.getAll();
        expect.unreachable("Should have thrown ApiHttpError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiHttpError);
        expect((err as ApiHttpError).status).toBe(401);
      }
    });
  });

  describe("Status 204 No Content Handling", () => {
    it("userService.delete handles 204 No Content smoothly without returning or corrupting", async () => {
      let capturedId: string | null = null;
      server.use(
        http.delete("*/api/users/:id", ({ params }) => {
          capturedId = params.id as string;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await userService.delete("user-999");
      expect(result).toBeUndefined();
      expect(capturedId).toBe("user-999");
    });

    it("shiftService.deletePattern handles 204 No Content correctly", async () => {
      let capturedId: string | null = null;
      server.use(
        http.delete("*/api/shifts/patterns/:id", ({ params }) => {
          capturedId = params.id as string;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await shiftService.deletePattern("pat-999");
      expect(result).toBeUndefined();
      expect(capturedId).toBe("pat-999");
    });
  });

  describe("Malformed Body & Error Typing", () => {
    it("throws typed ApiHttpError when backend responds with non-JSON or malformed error", async () => {
      server.use(
        http.get("*/api/shifts/patterns", () => {
          return new HttpResponse("<html>Bad Request 400</html>", {
            status: 400,
            headers: { "Content-Type": "text/html" },
          });
        }),
      );

      try {
        await shiftService.getPatterns();
        expect.unreachable("Should have thrown ApiHttpError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiHttpError);
        const apiErr = err as ApiHttpError;
        expect(apiErr.status).toBe(400);
      }
    });

    it("throws typed ApiHttpError on 400 Bad Request with backend message", async () => {
      server.use(
        http.post("*/api/users", () => {
          return HttpResponse.json({ message: "El nombre de usuario ya existe" }, { status: 400 });
        }),
      );

      try {
        await userService.create({
          username: "existing_user",
          role: "Usuario",
        } as unknown as Parameters<typeof userService.create>[0]);
        expect.unreachable("Should have thrown ApiHttpError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiHttpError);
        const apiErr = err as ApiHttpError;
        expect(apiErr.status).toBe(400);
        expect(apiErr.message).toBe("El nombre de usuario ya existe");
      }
    });
  });

  describe("Happy Path Service Responses & Contract Compliance", () => {
    it("userService.getAll returns user list conforming to OpenAPI contract", async () => {
      const users = await userService.getAll();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(users[0].id).toBe(fixtures.mockUser.id);
      expect(users[0].username).toBe(fixtures.mockUser.username);
    });

    it("shiftService.getPatterns returns shift patterns conforming to contract", async () => {
      const patterns = await shiftService.getPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].id).toBe(fixtures.mockShiftPattern.id);
    });

    it("leaveService.getAll returns paginated leaves conforming to contract", async () => {
      const leaves = await leaveService.getAll();
      expect(leaves.data).toBeDefined();
      expect(leaves.data.length).toBeGreaterThan(0);
      expect(leaves.data[0].id).toBe(fixtures.mockLeave.id);
    });
  });
});
