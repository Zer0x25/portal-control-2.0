import { describe, it, expect } from "vitest";

import { loginFormSchema } from "../../schemas/forms/auth";

/**
 * Spec 036 T12 (AC2): reglas exclusivas del cliente en los formularios de
 * autenticacion.
 *
 * `loginFormSchema` es la copia del contrato `Login` (el backend solo pide
 * `required`, sin longitud) **mas** la regla de no-vacio que el formulario
 * necesita: la capa no normaliza este formulario (la credencial viaja sin
 * recortar, spec 036 T13), asi que sin el `superRefine` un campo vacio
 * llegaria a la API. Antes lo bloqueaba el `required` nativo del `<form>`.
 *
 * Un `superRefine` no aparece en el JSON Schema que compara la paridad: el
 * contrato `Login` no cambia.
 */
describe("loginFormSchema (spec 036 T12)", () => {
  it("acepta credenciales no vacias", () => {
    expect(loginFormSchema.safeParse({ username: "ana", password: "secreto123" }).success).toBe(
      true,
    );
  });

  it("marca el usuario vacio en el campo username", () => {
    const result = loginFormSchema.safeParse({ username: "", password: "secreto123" });

    expect(result.success).toBe(false);
    expect(result.error.issues.find((issue) => issue.path[0] === "username")?.message).toBe(
      "El usuario es obligatorio.",
    );
  });

  it("marca la contrasena vacia en el campo password", () => {
    const result = loginFormSchema.safeParse({ username: "ana", password: "" });

    expect(result.success).toBe(false);
    expect(result.error.issues.find((issue) => issue.path[0] === "password")?.message).toBe(
      "La contraseña es obligatorio.",
    );
  });

  it("valida con la credencial recortada aunque el payload la envie en crudo", () => {
    // La validacion recorta (`requiredText` trims); el valor del formulario
    // no lo toca la capa con `normalize` desactivado. Comportamiento fijado
    // tambien en `useAppForm.test.tsx`.
    expect(
      loginFormSchema.safeParse({ username: "  ana  ", password: "  secreto123  " }).success,
    ).toBe(true);
  });
});
