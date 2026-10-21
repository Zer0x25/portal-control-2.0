import React, { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TabNav, { TabItem } from "../../components/ui/TabNav";

describe("TabNav Keyboard Navigation in Real Browser (AC5)", () => {
  const tabs: TabItem[] = [
    { id: "tab-1", label: "General" },
    { id: "tab-2", label: "Horarios" },
    { id: "tab-3", label: "Permisos" },
  ];

  it("handles roving tabindex and arrow key navigation in real Chromium DOM", async () => {
    const TestComponent = () => {
      const [activeTab, setActiveTab] = useState("tab-1");
      return <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
    };

    render(<TestComponent />);

    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();

    const tab1 = screen.getByRole("tab", { name: "General" });
    const tab2 = screen.getByRole("tab", { name: "Horarios" });
    const tab3 = screen.getByRole("tab", { name: "Permisos" });

    // Roving tabindex: active tab has tabIndex 0, others -1
    expect(tab1).toHaveAttribute("tabindex", "0");
    expect(tab2).toHaveAttribute("tabindex", "-1");
    expect(tab3).toHaveAttribute("tabindex", "-1");

    tab1.focus();
    expect(document.activeElement).toBe(tab1);

    // Press ArrowRight on tablist -> moves focus and activates tab-2
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => {
      expect(tab2).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tab2);
    });
    expect(tab2).toHaveAttribute("tabindex", "0");
    expect(tab1).toHaveAttribute("tabindex", "-1");

    // Press ArrowRight again -> moves to tab-3
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    await waitFor(() => {
      expect(tab3).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tab3);
    });

    // Press Home -> moves directly to tab-1
    fireEvent.keyDown(tablist, { key: "Home" });
    await waitFor(() => {
      expect(tab1).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tab1);
    });

    // Press End -> moves directly to tab-3
    fireEvent.keyDown(tablist, { key: "End" });
    await waitFor(() => {
      expect(tab3).toHaveAttribute("aria-selected", "true");
      expect(document.activeElement).toBe(tab3);
    });
  });
});
