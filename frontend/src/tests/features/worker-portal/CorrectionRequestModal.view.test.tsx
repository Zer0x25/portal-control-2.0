import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CorrectionRequestModalView from "../../../features/worker-portal/components/CorrectionRequestModal.view";

describe("CorrectionRequestModalView", () => {
  it("AC6: no ofrece selector ni controles para adjuntar archivos", () => {
    render(
      <CorrectionRequestModalView
        isOpen
        onClose={vi.fn()}
        record={{ id: "r1", employeeId: "e1" } as never}
        field="entrada"
        requestedValue="2026-03-05T09:00"
        maxRequestedValue="2026-03-06T12:00"
        reason="Olvidé marcar"
        isSubmitting={false}
        originalValue="2026-03-05T08:00:00.000Z"
        onRequestedValueChange={vi.fn()}
        onReasonChange={vi.fn()}
        formProps={{
          id: "correction-form",
          noValidate: true,
          onSubmit: vi.fn(),
          "data-app-form": "correctionRequestForm",
        }}
      />,
    );

    expect(screen.queryByText("Justificativo Adjunto")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });
});
