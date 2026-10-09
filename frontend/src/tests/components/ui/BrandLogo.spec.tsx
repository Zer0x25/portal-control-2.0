import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BrandLogo from "../../../components/ui/BrandLogo";
import type { BrandLogo as BrandLogoValue } from "../../../services/configService";

const mockRefetch = vi.fn();
let mockData: BrandLogoValue | null = null;

vi.mock("../../../hooks/queries/useConfigQuery", () => ({
  useBrandLogoQuery: () => ({ data: mockData, refetch: mockRefetch }),
}));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("BrandLogo (spec 027)", () => {
  it("usa el asset empaquetado con dimensiones anti-CLS cuando no hay configuración", () => {
    mockData = null;
    renderWithClient(<BrandLogo className="h-20" />);
    const img = screen.getByAltText("Logo");
    expect(img).toHaveAttribute("src", expect.stringContaining("Mini_Zer0x"));
    expect(img).toHaveAttribute("width", "512");
    expect(img).toHaveAttribute("height", "188");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveClass("h-20");
  });

  it("renderiza el logo remoto configurado con su tamaño (sin clases de tamaño heredadas)", async () => {
    mockData = {
      source: { kind: "url", ref: "https://cdn.cliente/logo.webp" },
      width: 320,
      height: 120,
    };
    renderWithClient(<BrandLogo />);
    const img = screen.getByAltText("Logo");
    await waitFor(() => expect(img).toHaveAttribute("src", "https://cdn.cliente/logo.webp"));
    expect(img).toHaveAttribute("width", "320");
    expect(img).toHaveAttribute("height", "120");
    expect(img.style.width).toBe("320px");
    expect(img.style.height).toBe("120px");
  });

  it("cambia al fallback empaquetado si el remoto falla (sin bucle)", async () => {
    mockData = {
      source: { kind: "url", ref: "https://caido.cl/logo.png" },
      width: 256,
      height: 256,
    };
    renderWithClient(<BrandLogo />);
    const img = screen.getByAltText("Logo");
    img.dispatchEvent(new Event("error"));
    await waitFor(() => expect(img).toHaveAttribute("src", expect.stringContaining("Mini_Zer0x")));
    expect(img).toHaveAttribute("width", "512");
    expect(img).toHaveAttribute("height", "188");
    // Segundo error: no vuelve a tocar el src (sin bucle).
    img.dispatchEvent(new Event("error"));
    expect(img).toHaveAttribute("src", expect.stringContaining("Mini_Zer0x"));
  });
});
