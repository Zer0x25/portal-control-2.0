import { AppError, ConflictError } from "../../src/utils/AppError";

describe("AppError utility classes", () => {
  describe("ConflictError", () => {
    it("should instantiate with default message", () => {
      const error = new ConflictError();
      expect(error.message).toBe("Conflicto: El recurso ya existe");
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should instantiate with custom message", () => {
      const customMessage = "Custom conflict message";
      const error = new ConflictError(customMessage);
      expect(error.message).toBe(customMessage);
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe("CONFLICT");
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });
  });
});
