import React, { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AttachmentViewerModal from "../../../features/supervisor-dashboard/components/AttachmentViewerModal";
import RejectionReasonModalView from "../../../features/supervisor-dashboard/components/RejectionReasonModal.view";

function Fixture({ submitting = false }: { submitting?: boolean }) {
  const [open, setOpen] = useState<"attachment" | "reject" | null>(null);
  return (
    <>
      <button onClick={() => setOpen("attachment")}>Abrir adjunto</button>
      <button onClick={() => setOpen("reject")}>Rechazar solicitud</button>
      <AttachmentViewerModal
        isOpen={open === "attachment"}
        onClose={() => setOpen(null)}
        attachment={{
          filename: "comprobante.png",
          mimeType: "image/png",
          data: "data:image/png;base64,AA==",
        }}
      />
      <RejectionReasonModalView
        isOpen={open === "reject"}
        onClose={() => setOpen(null)}
        values={{ rejectionReason: "" }}
        getError={() => undefined}
        handleReasonChange={vi.fn()}
        isSubmitting={submitting}
        formProps={{
          id: "rejection",
          noValidate: true,
          onSubmit: vi.fn(),
          "data-app-form": "rejection",
        }}
      />
    </>
  );
}

describe("Diálogos de solicitudes de supervisión", () => {
  it.each([
    ["Abrir adjunto", "Vista: comprobante.png"],
    ["Rechazar solicitud", "Motivo de Rechazo"],
  ])("aísla el fondo y devuelve el foco al cerrar %s", async (button, name) => {
    const user = userEvent.setup();
    const { container } = render(<Fixture />);
    const opener = screen.getByRole("button", { name: button });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name });
    expect(container).toHaveAttribute("inert");
    expect(dialog).toHaveFocus();
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(container).not.toHaveAttribute("inert");
    expect(opener).toHaveFocus();
  });

  it("mantiene abierto el rechazo durante el envío", async () => {
    const user = userEvent.setup();
    render(<Fixture submitting />);
    await user.click(screen.getByRole("button", { name: "Rechazar solicitud" }));
    const dialog = screen.getByRole("dialog", { name: "Motivo de Rechazo" });
    await user.keyboard("{Escape}");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cerrar modal" })).toBeDisabled();
  });
});
