import type { AugmentedTimeRecord, AuditLog, TimeRecordField } from "../../../types";
import { formatDisplayDateTime } from "../../../utils/formatters";
import { useTimeRecordRowController } from "./useTimeRecordRowController";

export function useMobileEditIndicator(
  record: AugmentedTimeRecord,
  accountingLockDate: string | null,
  externalEdits?: AuditLog[],
) {
  const { getCellEditInfo } = useTimeRecordRowController({
    record,
    accountingLockDate,
    roleBasedTooltip: "",
    externalEdits,
  });
  return (field: TimeRecordField) => {
    const edit = getCellEditInfo(field);
    return edit ? (
      <span
        className="ml-1 text-token-status-warning"
        title={`Editado por ${edit.actor}; valor original: ${formatDisplayDateTime(edit.oldValue)}`}
        aria-label={`Editado por ${edit.actor}`}
      >
        ✎
      </span>
    ) : null;
  };
}
