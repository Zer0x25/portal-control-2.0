import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TabNav from "../../components/ui/TabNav";

/**
 * Spec 031 T12 (AC7): TabNav con semantica APG y navegacion por teclado.
 */

const TABS = [
  { id: "one", label: "Uno" },
  { id: "two", label: "Dos" },
  { id: "three", label: "Tres" },
];

function ControlledTabNav({ onChange }: { onChange?: (id: string) => void }) {
  const [active, setActive] = useState("one");
  return (
    <TabNav
      tabs={TABS}
      activeTab={active}
      onTabChange={(id) => {
        setActive(id);
        onChange?.(id);
      }}
    />
  );
}

describe("TabNav (spec 031 AC7)", () => {
  it("expone tablist y tabs con aria-selected", () => {
    render(<ControlledTabNav />);
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label");

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("aplica roving tabindex: solo la pestana activa es tabulable", () => {
    render(<ControlledTabNav />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(tabs[2]).toHaveAttribute("tabindex", "-1");
  });

  it("navega con flechas, activa la pestana y mueve el foco", async () => {
    const onChange = vi.fn();
    render(<ControlledTabNav onChange={onChange} />);
    const tablist = screen.getByRole("tablist");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("two"));
    await waitFor(() => expect(document.activeElement?.getAttribute("role")).toBe("tab"));
    expect(document.activeElement?.textContent).toContain("Dos");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("three"));

    // Wrap-around
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("one"));
  });

  it("navega al inicio y al final con Home/End", async () => {
    const onChange = vi.fn();
    render(<ControlledTabNav onChange={onChange} />);
    const tablist = screen.getByRole("tablist");

    fireEvent.keyDown(tablist, { key: "End" });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("three"));

    fireEvent.keyDown(tablist, { key: "Home" });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("one"));
  });

  it("selecciona con click", () => {
    const onChange = vi.fn();
    render(<ControlledTabNav onChange={onChange} />);
    fireEvent.click(screen.getByText("Tres"));
    expect(onChange).toHaveBeenCalledWith("three");
  });

  it("expone los test ids de tablist y pestana", () => {
    render(
      <TabNav
        tabs={TABS}
        activeTab="two"
        onTabChange={vi.fn()}
        testId="config-tabs"
        tabTestIdPrefix="config-tab"
        ariaLabel="Secciones"
      />,
    );
    expect(screen.getByTestId("config-tabs")).toHaveAttribute("data-active-tab", "two");
    expect(screen.getByTestId("config-tab-one")).toBeInTheDocument();
  });
});
