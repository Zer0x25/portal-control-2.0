import { useEffect, useRef, useState } from "react";
import { AugmentedTimeRecord, AuditLog } from "../../../types/index";
import { useRecordIndicators, type PendingIndicator } from "./useRecordIndicators";

interface UseTimeRecordTableControllerParams {
  records: AugmentedTimeRecord[];
  onExportStreaming: (format: "csv" | "excel" | "pdf") => void | Promise<void>;
}

export const useTimeRecordTableController = ({
  records,
  onExportStreaming,
}: UseTimeRecordTableControllerParams) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const {
    data: indicators,
    isError: indicatorsError,
    refetch: retryIndicators,
  } = useRecordIndicators(records.map((record) => record.id));

  const editsMapAll = (() => {
    const globalLogMap = new Map<string, AuditLog[]>();
    for (const log of indicators?.edits ?? []) {
      if (log.details?.recordId) {
        const rId = String(log.details.recordId);
        if (!globalLogMap.has(rId)) globalLogMap.set(rId, []);
        globalLogMap.get(rId)?.push(log);
      }
    }
    return globalLogMap;
  })();

  const pendingRequestsMap = (() => {
    const map = new Map<string, PendingIndicator>();
    const currentRequests = indicators?.pending ?? [];
    if (currentRequests.length === 0) return map;

    for (const req of currentRequests) {
      if (req.status === "pending") {
        map.set(String(req.timeRecordId), req);
      }
    }
    return map;
  })();

  useEffect(() => {
    if (!isExportMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExportMenuOpen]);

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setIsExportMenuOpen(false);
    await onExportStreaming(format);
  };

  return {
    editsMapAll,
    exportMenuRef,
    handleExport,
    isExportMenuOpen,
    pendingRequestsMap,
    indicatorsError,
    retryIndicators,
    setIsExportMenuOpen,
  };
};
