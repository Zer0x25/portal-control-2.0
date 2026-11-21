import React, { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CinematicModal from "../../components/ui/CinematicModal";

function NestedDialogs() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button onClick={() => setOuter(true)}>Abrir exterior</button>
      <CinematicModal isOpen={outer} onClose={() => setOuter(false)} title="Exterior">
        <button onClick={() => setInner(true)}>Abrir interior</button>
        <CinematicModal isOpen={inner} onClose={() => setInner(false)} title="Interior">
          <button>Acción interior</button>
        </CinematicModal>
      </CinematicModal>
    </>
  );
}

describe("shared modal accessibility", () => {
  it("isolates the background and restores focus and preexisting inert state", async () => {
    const user = userEvent.setup();
    const preexisting = document.createElement("div");
    preexisting.setAttribute("inert", "");
    document.body.appendChild(preexisting);
    const { container } = render(<NestedDialogs />);
    const opener = screen.getByRole("button", { name: "Abrir exterior" });
    await user.click(opener);
    const outer = screen.getByRole("dialog", { name: "Exterior" });
    expect(container).toHaveAttribute("inert");
    expect(outer).toHaveFocus();
    const innerOpener = within(outer).getByRole("button", { name: "Abrir interior" });
    await user.click(innerOpener);
    const inner = screen.getByRole("dialog", { name: "Interior" });
    expect(outer.closest("[inert]")).not.toBeNull();
    expect(inner).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(innerOpener).toHaveFocus());
    expect(container).toHaveAttribute("inert");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(opener).toHaveFocus());
    expect(container).not.toHaveAttribute("inert");
    expect(preexisting).toHaveAttribute("inert");
    preexisting.remove();
  });
});
