import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DashboardQuickNotesModal,
  DashboardShiftReportModal,
} from "../../../features/dashboard/components/DashboardDeferredModals";

const { notesMounted, reportMounted } = vi.hoisted(() => ({
  notesMounted: vi.fn(),
  reportMounted: vi.fn(),
}));

vi.mock("../../../features/dashboard/components/QuickNotesModal.container", () => ({
  default: function NotesFixture({ isOpen }: { isOpen: boolean }) {
    notesMounted();
    const [draft, setDraft] = useState("");
    return isOpen ? (
      <input aria-label="Draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
    ) : null;
  },
}));
vi.mock("../../../features/logbook/components/ShiftReportModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => {
    reportMounted();
    return isOpen ? <p>Report ready</p> : null;
  },
}));

describe("Dashboard deferred modals", () => {
  it("does not mount controllers before first opening and preserves a draft across closing", async () => {
    notesMounted.mockClear();
    const onClose = vi.fn();
    const { rerender } = render(<DashboardQuickNotesModal isOpen={false} onClose={onClose} />);
    expect(notesMounted).not.toHaveBeenCalled();
    rerender(<DashboardQuickNotesModal isOpen onClose={onClose} />);
    fireEvent.change(await screen.findByLabelText("Draft"), { target: { value: "Unsent" } });
    rerender(<DashboardQuickNotesModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByLabelText("Draft")).not.toBeInTheDocument();
    rerender(<DashboardQuickNotesModal isOpen onClose={onClose} />);
    expect(await screen.findByLabelText("Draft")).toHaveValue("Unsent");
  });

  it("does not mount the report until opened", async () => {
    reportMounted.mockClear();
    const props = { isOpen: false, onClose: vi.fn(), report: null };
    const { rerender } = render(<DashboardShiftReportModal {...props} />);
    expect(reportMounted).not.toHaveBeenCalled();
    rerender(<DashboardShiftReportModal {...props} isOpen />);
    expect(await screen.findByText("Report ready")).toBeInTheDocument();
  });
});
