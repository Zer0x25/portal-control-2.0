import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../../store/useStore";

describe("theme slice DOM application", () => {
  const originalTheme = useStore.getState().theme;

  beforeEach(() => {
    document.getElementById("disable-transitions")?.remove();
    document.documentElement.classList.remove("dark");
    useStore.setState({ theme: originalTheme, effectiveTheme: "light" });
  });

  afterEach(() => {
    document.getElementById("disable-transitions")?.remove();
    document.documentElement.classList.remove("dark");
    useStore.setState({ theme: originalTheme, effectiveTheme: "light" });
    vi.restoreAllMocks();
  });

  it("skips DOM writes and redundant store updates when the bootstrap already applied the theme", () => {
    document.documentElement.classList.add("dark");
    const appendToHead = vi.spyOn(document.head, "appendChild");
    const readComputedStyle = vi.spyOn(window, "getComputedStyle");
    const scheduleCleanup = vi.spyOn(window, "requestAnimationFrame");
    let storeUpdates = 0;
    const unsubscribe = useStore.subscribe(() => {
      storeUpdates += 1;
    });

    useStore.getState()._applyTheme("dark");
    useStore.getState()._applyTheme("dark");
    unsubscribe();

    expect(useStore.getState().effectiveTheme).toBe("dark");
    expect(storeUpdates).toBe(1);
    expect(appendToHead).not.toHaveBeenCalled();
    expect(readComputedStyle).not.toHaveBeenCalled();
    expect(scheduleCleanup).not.toHaveBeenCalled();
  });

  it("keeps transition suppression when applying a different theme", () => {
    const appendToHead = vi.spyOn(document.head, "appendChild");
    const readComputedStyle = vi.spyOn(window, "getComputedStyle");
    const scheduleCleanup = vi.spyOn(window, "requestAnimationFrame");

    useStore.getState()._applyTheme("dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(useStore.getState().effectiveTheme).toBe("dark");
    expect(appendToHead).toHaveBeenCalledOnce();
    expect(readComputedStyle).toHaveBeenCalledOnce();
    expect(scheduleCleanup).toHaveBeenCalledOnce();
    expect(document.getElementById("disable-transitions")).not.toBeNull();
  });
});
