import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import LogoutCountdownDialog from "../../features/logbook/components/LogoutCountdownDialog";

describe("LogoutCountdownDialog", () => {
  it("anuncia el cierre, aísla la página y mantiene el foco durante la cuenta regresiva", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<LogoutCountdownDialog countdown={10} />);
    const dialog = screen.getByRole("alertdialog", { name: "Operación Finalizada" });
    expect(dialog).toHaveAccessibleDescription("Cierre de sesión automático en...");
    expect(dialog).toHaveFocus();
    expect(container).toHaveAttribute("inert");
    await user.tab();
    await user.keyboard("{Escape}");
    expect(dialog).toHaveFocus();
    expect(dialog).toBeInTheDocument();
    unmount();
    expect(container).not.toHaveAttribute("inert");
  });
});
