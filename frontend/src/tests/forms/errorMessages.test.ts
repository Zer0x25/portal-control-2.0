import { describe, it, expect } from "vitest";

import { ERROR_MESSAGES } from "../../utils/errorMessages";

/**
 * Spec 036 T3 (AC2): el mapa central de mensajes es **un contrato**.
 *
 * Cada mensaje se fija aquí a propósito: el objetivo del mapa es que el mismo
 * error se exprese **igual** en todos los formularios. Un test que fija el
 * texto hace visible cualquier cambio de copy (que es una decisión de
 * producto, no un efecto colateral de una refactorización).
 */
describe("ERROR_MESSAGES (spec 036 AC2)", () => {
  it("expresiona los campos obligatorios con el nombre del campo", () => {
    expect(ERROR_MESSAGES.required("Nombre")).toBe("Nombre es obligatorio.");
  });

  it("parametriza las longitudes en lugar de duplicarlas en texto fijo", () => {
    expect(ERROR_MESSAGES.minLength("Nombre", 2)).toBe("Nombre debe tener al menos 2 caracteres.");
    expect(ERROR_MESSAGES.maxLength("Nombre", 50)).toBe(
      "Nombre no puede superar los 50 caracteres.",
    );
    expect(ERROR_MESSAGES.passwordTooShort(6)).toBe(
      "La nueva contraseña debe tener al menos 6 caracteres.",
    );
  });

  it("unifica el mensaje de email en todos los formularios", () => {
    expect(ERROR_MESSAGES.invalidEmail()).toBe("Formato de email inválido.");
  });

  it("unifica los mensajes de RUT", () => {
    expect(ERROR_MESSAGES.invalidRut()).toBe("RUT inválido. Verifique el dígito verificador.");
    expect(ERROR_MESSAGES.duplicateRut()).toBe("Error: RUT ya Registrado.");
    expect(ERROR_MESSAGES.rutTooShort()).toBe("RUT demasiado corto.");
  });

  it("unifica el mensaje del PIN (regla del backend: 4 dígitos)", () => {
    expect(ERROR_MESSAGES.invalidPin()).toBe(
      "El PIN debe contener exactamente 4 dígitos numéricos",
    );
  });

  it("unifica el mensaje de contraseñas que no coinciden", () => {
    expect(ERROR_MESSAGES.passwordMismatch()).toBe("Las nuevas contraseñas no coinciden.");
  });

  it("parametriza el rango horario", () => {
    expect(ERROR_MESSAGES.timeOutOfRange("08:00", "20:00")).toBe(
      "La hora debe estar entre 08:00 y 20:00.",
    );
  });

  it("unifica los mensajes de fecha", () => {
    expect(ERROR_MESSAGES.invalidDate()).toBe("Formato de fecha inválido (YYYY-MM-DD)");
    expect(ERROR_MESSAGES.invalidDateRange()).toBe(
      "La fecha de término debe ser posterior a la fecha de inicio.",
    );
  });

  it("unifica los mensajes de duplicado y de valor numérico", () => {
    expect(ERROR_MESSAGES.duplicate("RUT")).toBe("RUT ya está registrado.");
    expect(ERROR_MESSAGES.invalidNumber()).toBe("Ingrese un valor numérico válido.");
  });

  it("expone un mensaje genérico para los casos sin regla específica", () => {
    expect(ERROR_MESSAGES.generic()).toBe("Revise los datos ingresados e intente nuevamente.");
  });
});
