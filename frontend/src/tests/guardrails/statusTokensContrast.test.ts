import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Spec 031 T5 (AC4): contraste WCAG de los tokens de dominio.
 *
 * Los tokens `--status-*` (semántica del turno) y `--chart-*` (data-viz) se
 * declaran en `src/index.css` con valores light/dark. Este guardrail calcula
 * el ratio de contraste real (WCAG 2.1) para que un cambio de hex no rompa
 * el contraste AA:
 * - Texto de estado sobre su surface: >= 4.5:1 (AA texto normal).
 * - Color fuerte del estado sobre su surface: >= 3:1 (AA no textual).
 * - Colores de chart contra la surface de card: >= 3:1 (WCAG 1.4.11).
 */

const INDEX_CSS = path.resolve(__dirname, "../../index.css");

const STATUS_KEYS = [
  "laborando",
  "colacion",
  "ausente",
  "vacaciones",
  "permiso-especial",
  "licencia-medica",
  "anomalia",
  "sin-marcaje",
  "completado",
  "feriado",
  "no-programado",
] as const;

const GENERIC_STATUS_KEYS = ["success", "warning", "error", "info"] as const;

const CHART_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;
/** Tinte del 10% que usa RoleBadge/IconBox sobre la card. */
const TINT_RATIO = 0.1;

function parseBlocks(css: string): { light: string; dark: string } {
  const darkMatch = /\.dark\s*\{/.exec(css);
  if (!darkMatch) throw new Error("No se encontro el bloque .dark en index.css");
  const darkStart = darkMatch.index;
  const darkEnd = css.indexOf("}", darkStart);
  return {
    light: css.slice(0, darkStart),
    dark: css.slice(darkStart, darkEnd),
  };
}

function parseVars(block: string): Map<string, string> {
  const vars = new Map<string, string>();
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let match = re.exec(block);
  while (match) {
    const [, name, value] = match;
    if (!vars.has(name)) {
      vars.set(name, value.trim());
    }
    match = re.exec(block);
  }
  return vars;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(hexToRgb(foreground));
  const l2 = relativeLuminance(hexToRgb(background));
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/** Mezcla tipo color-mix: `ratio` del color sobre el fondo (tinte). */
function mixOver(color: string, background: string, ratio: number): string {
  const fg = hexToRgb(color);
  const bg = hexToRgb(background);
  return `#${fg
    .map((channel, index) =>
      Math.round(channel * ratio + bg[index] * (1 - ratio))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

const css = readFileSync(INDEX_CSS, "utf8");
const blocks = parseBlocks(css);
const lightVars = parseVars(blocks.light);
const darkVars = parseVars(blocks.dark);

function requireVar(vars: Map<string, string>, name: string, theme: string): string {
  const value = vars.get(name);
  expect(value, `Falta ${name} en ${theme}`).toBeTruthy();
  expect(value, `${name} debe ser HEX en ${theme}`).toMatch(/^#[0-9a-fA-F]{3,6}$/);
  return value as string;
}

describe("Contraste de tokens de dominio (spec 031 AC4)", () => {
  for (const key of STATUS_KEYS) {
    it(`${key}: texto AA sobre su surface en claro y oscuro`, () => {
      const lightText = requireVar(lightVars, `status-${key}-text`, "light");
      const lightSurface = requireVar(lightVars, `status-${key}-surface`, "light");
      const lightStrong = requireVar(lightVars, `status-${key}`, "light");

      expect(contrastRatio(lightText, lightSurface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(lightStrong, lightSurface)).toBeGreaterThanOrEqual(AA_NON_TEXT);

      const darkText = requireVar(darkVars, `status-${key}-text`, "dark");
      const darkSurface = requireVar(darkVars, `status-${key}-surface`, "dark");
      const darkStrong = requireVar(darkVars, `status-${key}`, "dark");

      expect(contrastRatio(darkText, darkSurface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(darkStrong, darkSurface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  }

  it("chart-1..8 mantienen contraste de texto contra la card y su tinte", () => {
    const lightCard = requireVar(lightVars, "surface-card", "light");
    const darkCard = requireVar(darkVars, "surface-card", "dark");

    for (const index of CHART_KEYS) {
      const lightChart = requireVar(lightVars, `chart-${index}`, "light");
      const darkChart = requireVar(darkVars, `chart-${index}`, "dark");

      // Uso categorico en badge: texto sobre el tinte del 10% de la card.
      expect(
        contrastRatio(lightChart, mixOver(lightChart, lightCard, TINT_RATIO)),
        `chart-${index} claro sobre su tinte`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expect(
        contrastRatio(darkChart, mixOver(darkChart, darkCard, TINT_RATIO)),
        `chart-${index} oscuro sobre su tinte`,
      ).toBeGreaterThanOrEqual(AA_TEXT);

      // Uso data-viz: relleno contra la card.
      expect(contrastRatio(lightChart, lightCard), `chart-${index} claro`).toBeGreaterThanOrEqual(
        AA_NON_TEXT,
      );
      expect(contrastRatio(darkChart, darkCard), `chart-${index} oscuro`).toBeGreaterThanOrEqual(
        AA_NON_TEXT,
      );
    }
  });

  it("estados genericos: texto AA sobre su surface en claro y oscuro", () => {
    for (const key of GENERIC_STATUS_KEYS) {
      const lightText = requireVar(lightVars, `status-${key}-text`, "light");
      const lightSurface = requireVar(lightVars, `status-${key}-surface`, "light");
      expect(contrastRatio(lightText, lightSurface), `status-${key} claro`).toBeGreaterThanOrEqual(
        AA_TEXT,
      );

      const darkText = requireVar(darkVars, `status-${key}-text`, "dark");
      const darkSurface = requireVar(darkVars, `status-${key}-surface`, "dark");
      expect(contrastRatio(darkText, darkSurface), `status-${key} oscuro`).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
    }
  });

  it("expone los tokens en @theme para generar utilidades Tailwind", () => {
    for (const key of STATUS_KEYS) {
      expect(lightVars.get(`color-token-status-${key}`)).toBeTruthy();
      expect(lightVars.get(`color-token-status-${key}-surface`)).toBeTruthy();
      expect(lightVars.get(`color-token-status-${key}-text`)).toBeTruthy();
    }
    for (const key of GENERIC_STATUS_KEYS) {
      expect(lightVars.get(`color-token-status-${key}-surface`)).toBeTruthy();
      expect(lightVars.get(`color-token-status-${key}-text`)).toBeTruthy();
    }
    for (const index of CHART_KEYS) {
      expect(lightVars.get(`color-token-chart-${index}`)).toBeTruthy();
    }
  });
});
