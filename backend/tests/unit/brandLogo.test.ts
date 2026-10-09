import { describe, expect, it } from "vitest";
import { validateBrandLogoMime, validateBrandLogoValue } from "../../src/modules/configs";

const valid = {
  source: { kind: "upload", ref: "brand-logo-abc123.png" },
  width: 512,
  height: 188,
};

describe("validateBrandLogoValue (spec 027)", () => {
  it("acepta fuente upload y url https con dimensiones en rango", () => {
    expect(validateBrandLogoValue(valid)).toEqual(valid);
    expect(
      validateBrandLogoValue({
        source: { kind: "url", ref: "https://cdn.cliente.cl/logo.webp" },
        width: 16,
        height: 512,
      }),
    ).toEqual({
      source: { kind: "url", ref: "https://cdn.cliente.cl/logo.webp" },
      width: 16,
      height: 512,
    });
  });

  it("rechaza formas inválidas con 400 en español", () => {
    for (const bad of [null, "x", 42, [], { width: 100, height: 100 }]) {
      expect(() => validateBrandLogoValue(bad)).toThrowError(/fuente/i);
    }
  });

  it("rechaza dimensiones fuera de 16–512 px o no enteras", () => {
    for (const dims of [
      { width: 15, height: 100 },
      { width: 513, height: 100 },
      { width: 100.5, height: 100 },
      { width: "100", height: 100 },
    ]) {
      expect(() => validateBrandLogoValue({ source: valid.source, ...dims })).toThrowError(
        /píxeles|entero/,
      );
    }
  });

  it("rechaza URL no https o malformada, y upload con ruta o extensión mala", () => {
    expect(() =>
      validateBrandLogoValue({
        source: { kind: "url", ref: "http://inseguro.cl/logo.png" },
        width: 100,
        height: 100,
      }),
    ).toThrowError(/HTTPS/);
    expect(() =>
      validateBrandLogoValue({
        source: { kind: "url", ref: "no-es-url" },
        width: 100,
        height: 100,
      }),
    ).toThrowError(/válida/);
    for (const ref of ["../evil.png", "sub/dir.png", "logo.svg", "logo.pdf", ""]) {
      expect(() =>
        validateBrandLogoValue({ source: { kind: "upload", ref }, width: 100, height: 100 }),
      ).toThrowError(/referencia|archivo/i);
    }
  });

  it("valida el MIME declarado de subida", () => {
    expect(() => validateBrandLogoMime("image/png")).not.toThrow();
    expect(() => validateBrandLogoMime("application/pdf")).toThrowError(/PNG, JPG o WebP/);
    expect(() => validateBrandLogoMime("image/svg+xml")).toThrowError(/PNG, JPG o WebP/);
  });
});
