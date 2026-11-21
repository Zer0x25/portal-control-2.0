import React, { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AttachmentViewerModal from "../../../features/supervisor-dashboard/components/AttachmentViewerModal";
import RejectionReasonModalView from "../../../features/supervisor-dashboard/components/RejectionReasonModal.view";
import RejectionReasonModalContainer from "../../../features/supervisor-dashboard/components/RejectionReasonModal.container";

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
  it("valida el motivo, asocia el error al campo y confirma un valor válido", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<RejectionReasonModalContainer isOpen onClose={vi.fn()} onConfirm={onConfirm} />);
    const dialog = screen.getByRole("dialog", { name: "Motivo de Rechazo" });
    const field = within(dialog).getByRole("textbox", { name: /Justificación Técnica/ });
    const confirm = within(dialog).getByRole("button", { name: "Confirmar Rechazo" });

    await user.click(confirm);
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));
    const errorId = field.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent(/motivo del rechazo/i);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.type(field, "Datos incompletos");
    await user.click(confirm);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("Datos incompletos"));
  });

  it.each([
    ["image/png", "img"],
    ["application/pdf", "iframe"],
    ["application/octet-stream", "unsupported"],
  ])("presenta y permite descargar adjuntos de tipo %s", (mimeType, expected) => {
    render(
      <AttachmentViewerModal
        isOpen
        onClose={vi.fn()}
        attachment={{ filename: "archivo.prueba", mimeType, data: "data:,prueba" }}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Vista: archivo.prueba" });
    expect(within(dialog).getByRole("link", { name: /Descargar/ })).toHaveAttribute(
      "download",
      "archivo.prueba",
    );
    if (expected === "img")
      expect(within(dialog).getByRole("img")).toHaveAccessibleName("archivo.prueba");
    if (expected === "iframe")
      expect(within(dialog).getByTitle("archivo.prueba")).toBeInTheDocument();
    if (expected === "unsupported")
      expect(within(dialog).getByText(/no compatible/)).toBeInTheDocument();
  });

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
