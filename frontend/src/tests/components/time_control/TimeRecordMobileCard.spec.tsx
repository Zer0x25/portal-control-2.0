import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeRecordMobileCard from "../../../features/time-control/components/TimeRecordMobileCard";
import type { AugmentedTimeRecord, AuditLog } from "../../../types";

describe("TimeRecordMobileCard", () => {
  it("indicates the actual changed field from an audit event", () => {
    const record = {
      id: "record-1",
      employeeName: "Persona QA",
      employeeArea: "Área QA",
      date: "2026-11-17",
      status: "Completado",
      entrada: "2026-11-17T11:00:00.000Z",
      salida: "2026-11-17T21:00:00.000Z",
    } as AugmentedTimeRecord;
    const edit = {
      id: "audit-1",
      lastModified: "2026-11-18T10:00:00.000Z",
      syncStatus: "synced",
      isDeleted: false,
      action: "TIME_RECORD_EDITED",
      actorUsername: "admin",
      timestamp: "2026-11-18T10:00:00.000Z",
      details: {
        recordId: "record-1",
        oldValue: { entrada: record.entrada, salida: "2026-11-17T20:00:00.000Z" },
        newValue: { entrada: record.entrada, salida: record.salida },
      },
    } as AuditLog;
    render(
      <TimeRecordMobileCard
        record={record}
        externalEdits={[edit]}
        onRowDoubleClick={vi.fn()}
        onAddComment={vi.fn()}
        onDelete={vi.fn()}
        isActionDisabledForRole={false}
        accountingLockDate={null}
        isControlInternoEnabled
      />,
    );
    expect(screen.getAllByLabelText("Editado por admin")).toHaveLength(1);
  });
});
