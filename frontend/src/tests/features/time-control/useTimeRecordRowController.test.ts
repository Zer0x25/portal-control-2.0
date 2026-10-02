import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTimeRecordRowController } from "../../../features/time-control/hooks/useTimeRecordRowController";
import { AugmentedTimeRecord, AuditLog, CorrectionRequest } from "../../../types";

describe("useTimeRecordRowController", () => {
  it("flags lock and builds lock tooltip when record is before lock date", () => {
    const record = {
      id: "r1",
      date: "2026-03-01",
      status: "Laborando",
      employeeName: "Ana",
      employeeArea: "A1",
      employeePosition: "Operador",
      justification: null,
    } as unknown as AugmentedTimeRecord;

    const { result } = renderHook(() =>
      useTimeRecordRowController({
        record,
        accountingLockDate: "2026-03-05",
        roleBasedTooltip: "role tooltip",
      }),
    );

    expect(result.current.isLocked).toBe(true);
    expect(result.current.finalTooltip).toBe("Registro bloqueado por cierre contable.");
  });

  it("returns edited cell info and pending request marker", () => {
    const record = {
      id: "r1",
      date: "2026-03-10",
      status: "Completado",
      employeeName: "Ana",
      employeeArea: "A1",
      employeePosition: "Operador",
      justification: null,
    } as unknown as AugmentedTimeRecord;

    const { result } = renderHook(() =>
      useTimeRecordRowController({
        record,
        accountingLockDate: null,
        roleBasedTooltip: "role tooltip",
        externalEdits: [
          {
            id: "l1",
            action: "Time Record Edited",
            actorUsername: "admin",
            timestamp: "2026-03-10T10:00:00.000Z",
            lastModified: Date.now(),
            syncStatus: "synced",
            isDeleted: false,
            details: {
              fieldEdited: "entrada",
              oldValue: "2026-03-10T08:00:00.000Z",
            },
          } as unknown as AuditLog,
        ],
        externalPendingRequest: {
          id: "c1",
          employeeId: "e1",
          timeRecordId: "r1",
          recordField: "entrada",
          originalValue: "2026-03-10T08:00:00.000Z",
          requestedValue: "2026-03-10T08:15:00.000Z",
          reason: "ajuste",
          status: "pending",
          createdAt: Date.now(),
          lastModified: Date.now(),
          syncStatus: "synced",
          isDeleted: false,
        } as unknown as CorrectionRequest,
      }),
    );

    const editInfo = result.current.getCellEditInfo("entrada");
    expect(editInfo?.actor).toBe("admin");
    expect(result.current.pendingRequest?.id).toBe("c1");
  });
});
