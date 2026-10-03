import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ShieldIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExportIcon,
  ActivityIcon,
} from "../../../components/ui/icons/index";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { AuditLog } from "../../../types/index";
import { formatLogTimestamp } from "../../../utils/formatters";
import { useDebounce } from "../../../hooks/useDebounce";
import ResponsiveView from "../../../components/ui/ResponsiveView";
import ExportLogsModal from "../../../components/ui/ExportLogsModal";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import IconBox from "../../../components/ui/IconBox";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import AuditMonthSelector from "../../../components/ui/AuditMonthSelector";
import { AuditLogFilterPanel } from "./AuditLogFilterPanel";
import AuditLogDetailDrawer from "./AuditLogDetailDrawer";
import { SEVERITIES } from "../../../constants/audit";
import { startOfMonth, endOfMonth, format } from "date-fns";
import {
  useAuditLogsInfinite,
  AuditLogsFilterParams,
} from "../../../hooks/queries/useAuditLogsInfinite";
import Tooltip from "../../../components/ui/Tooltip";

const ROW_HEIGHT_DESKTOP = 48;
const ROW_HEIGHT_MOBILE = 90;
const DESKTOP_PAGE_SIZE = 100;
const MOBILE_PAGE_SIZE = 20;

const getCategoryStyles = (category: string) => {
  switch (category.toUpperCase()) {
    case "AUTH":
      return "bg-(--sidebar-text-active)/10 text-(--sidebar-text-active) border-(--sidebar-text-active)/20";
    case "SYSTEM":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "DATA":
    case "DATABASE":
      return "bg-(--status-success)/10 text-(--status-success) border-(--status-success)/20";
    case "TIME":
    case "CTRL_HOURS":
      return "bg-(--status-warning)/10 text-(--status-warning) border-(--status-warning)/20";
    case "SECURITY":
    case "SEGURIDAD":
      return "bg-(--status-error)/10 text-(--status-error) border-(--status-error)/20";
    default:
      return "bg-token-surface-stripe text-token-text-tertiary border-token-border-technical";
  }
};

const getOutcomeIcon = (outcome: string) => {
  switch (outcome) {
    case "SUCCESS":
      return <IconBox icon={<CheckCircleIcon />} variant="success" size="sm" />;
    case "FAILURE":
      return <IconBox icon={<XCircleIcon />} variant="danger" size="sm" />;
    case "BLOCKED":
      return <IconBox icon={<ShieldIcon />} variant="warning" size="sm" />;
    case "ERROR":
      return <IconBox icon={<ExclamationTriangleIcon />} variant="danger" size="sm" />;
    default:
      return <IconBox icon={<ActivityIcon />} variant="neutral" size="sm" />;
  }
};

interface AuditLogRowProps {
  log: AuditLog;
  virtualRow: {
    size: number;
    start: number;
  };
  onSelect: (log: AuditLog) => void;
}

const AuditLogDesktopRow = React.memo(({ log, virtualRow, onSelect }: AuditLogRowProps) => {
  const severity = SEVERITIES.find((s) => s.id === log.severity);

  return (
    <div
      onClick={() => onSelect(log)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      }}
      className="flex border-b border-token-border-technical hover:bg-(--sidebar-text-active)/5 transition-all duration-150 items-center group/row cursor-pointer"
    >
      <div
        style={{ width: "15%" }}
        className="px-6 py-3 whitespace-nowrap text-[11px] font-bold text-token-text-tertiary flex items-center font-mono uppercase"
      >
        <ClockIcon className="h-4 w-4 mr-3 text-token-text-tertiary opacity-70" />
        {formatLogTimestamp(log.timestamp)}
      </div>
      <div
        style={{ width: "15%" }}
        className="px-6 py-3 whitespace-nowrap text-sm font-bold text-token-text-primary truncate flex items-center uppercase tracking-tight"
      >
        <IconBox
          icon={<UserIcon />}
          variant="neutral"
          size="sm"
          className="mr-3 rounded-sm border border-token-border-technical"
        />
        {log.actorUsername}
      </div>
      <div
        style={{ width: "30%" }}
        className="px-6 py-3 text-[11px] font-semibold text-token-text-secondary tracking-tight block overflow-visible"
      >
        <Tooltip
          content={log.details ? `${log.action} | ${JSON.stringify(log.details)}` : log.action}
          position="top"
          className="w-full"
        >
          <span className="truncate block opacity-90">{log.action}</span>
        </Tooltip>
      </div>
      <div style={{ width: "12%" }} className="px-6 py-3 whitespace-nowrap">
        <span
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border shadow-sm ${getCategoryStyles(log.category || "")}`}
        >
          {log.category || "N/A"}
        </span>
      </div>
      <div style={{ width: "14%" }} className="px-6 py-3 whitespace-nowrap flex items-center">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm bg-token-surface-stripe border border-token-border-technical">
          <div
            className={`w-2 h-2 rounded-full ${severity?.color || "bg-token-border-subtle"} shadow-sm`}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-token-text-primary">
            {log.severity || "N/A"}
          </span>
        </div>
      </div>
      <div
        style={{ width: "14%" }}
        className="px-6 py-3 whitespace-nowrap flex items-center justify-center"
      >
        {getOutcomeIcon(log.outcome || "")}
      </div>
    </div>
  );
});

const AuditLogMobileRow = React.memo(({ log, virtualRow, onSelect }: AuditLogRowProps) => {
  const categoryStyles = getCategoryStyles(log.category || "");
  const categoryBorderColor = categoryStyles.split(" ").pop()?.replace("border-", "bg-");

  return (
    <div
      onClick={() => onSelect(log)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      }}
      className="p-4 bg-token-surface-card border-b border-token-border-technical relative overflow-hidden flex flex-col justify-center cursor-pointer active:bg-token-surface-active transition-colors"
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${categoryBorderColor}`} />
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold text-token-text-tertiary font-mono">
          {formatLogTimestamp(log.timestamp)}
        </span>
        {getOutcomeIcon(log.outcome || "")}
      </div>
      <h4 className="text-xs font-bold text-token-text-primary uppercase tracking-tight mb-1 truncate">
        {log.actorUsername}
      </h4>
      <p className="text-[10px] font-semibold text-token-text-secondary line-clamp-2 leading-tight">
        {log.action}
      </p>
    </div>
  );
});

AuditLogDesktopRow.displayName = "AuditLogDesktopRow";
AuditLogMobileRow.displayName = "AuditLogMobileRow";

const AuditLogsView: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const businessNow = useBusinessNow({ tickMs: null });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(() => new Date(businessNow));
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [filters, setFilters] = useState({
    categories: [] as string[],
    severities: [] as string[],
    outcomes: [] as string[],
    actorUsername: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  const debouncedFilters = useDebounce(filters, 500);

  const queryParams = useMemo(() => {
    const monthStart = format(startOfMonth(activeDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(activeDate), "yyyy-MM-dd");

    return {
      pageSize: isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE,
      sortBy: "timestamp",
      sortOrder: "desc" as "asc" | "desc",
      filters: {
        actorUsername: debouncedFilters.actorUsername,
        category: debouncedFilters.categories,
        severity: debouncedFilters.severities,
        outcome: debouncedFilters.outcomes,
        startDate: debouncedFilters.startDate || monthStart,
        endDate: debouncedFilters.endDate || monthEnd,
      },
    } as AuditLogsFilterParams;
  }, [debouncedFilters, activeDate, isMobile]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useAuditLogsInfinite(queryParams);

  const allLogs = useMemo(() => data?.pages.flatMap((page) => page.data || []) || [], [data]);
  const totalLogs = data?.pages[0]?.total || 0;

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: allLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP),
    overscan: 10,
  });

  // Infinite Scroll Hook
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= allLogs.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    allLogs.length,
    fetchNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  const renderMobileView = () => (
    <div
      ref={parentRef}
      className="h-[600px] overflow-y-auto custom-scrollbar bg-token-surface-stripe"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <AuditLogMobileRow
            key={virtualRow.key}
            log={allLogs[virtualRow.index]}
            virtualRow={{ size: virtualRow.size, start: virtualRow.start }}
            onSelect={setSelectedLog}
          />
        ))}
      </div>
    </div>
  );

  const renderDesktopView = () => (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-token-surface-header sticky top-0 z-30 shadow-sm border-b border-token-border-technical">
            <tr className="flex">
              {[
                { label: "Temporalidad", width: "15%" },
                { label: "Operador", width: "15%" },
                { label: "Acción Crítica", width: "30%" },
                { label: "Dominio", width: "12%" },
                { label: "Severidad", width: "14%" },
                { label: "Status", width: "14%", align: "center" },
              ].map((col) => (
                <th
                  key={col.label}
                  style={{ width: col.width }}
                  className={`px-6 h-[48px] text-[10px] font-bold uppercase tracking-widest text-token-text-tertiary border-b border-token-border-technical flex items-center ${col.align === "center" ? "justify-center" : ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div
          ref={parentRef}
          className="overflow-y-auto relative h-[600px] custom-scrollbar bg-token-surface-stripe"
          style={{ contain: "strict" }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <AuditLogDesktopRow
                key={virtualRow.key}
                log={allLogs[virtualRow.index]}
                virtualRow={{ size: virtualRow.size, start: virtualRow.start }}
                onSelect={setSelectedLog}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-token-text-primary uppercase tracking-tight">
            Visor de Auditoría
          </h3>
          <p className="text-[11px] text-token-text-tertiary">
            Historial detallado de eventos y trazabilidad forense
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsExportModalOpen(true)}
          className="px-6 h-10 font-bold uppercase text-[11px] tracking-widest bg-(--sidebar-text-active) text-white rounded-sm shadow-lg shadow-(--sidebar-text-active)/20"
        >
          <ExportIcon className="mr-2.5 h-4 w-4" /> Exportar Reporte
        </Button>
      </div>

      <AuditLogFilterPanel
        filters={filters}
        setFilters={setFilters}
        isOpen={isFiltersOpen}
        onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
      />

      <Card
        variant="premium"
        className="p-0! border-token-border-technical shadow-sm overflow-hidden rounded-sm"
        noPadding
      >
        <div className="px-6 py-4 border-b border-token-border-technical flex justify-between items-center bg-token-surface-stripe">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-token-text-primary uppercase tracking-tighter leading-none">
              {totalLogs.toLocaleString()}
            </h3>
            <span className="text-[10px] font-bold text-token-text-tertiary mt-1.5 tracking-wider uppercase">
              Registros en Periodo
            </span>
          </div>
          <AuditMonthSelector currentDate={activeDate} onChange={setActiveDate} />
        </div>
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-[500px] uppercase text-[10px] font-bold tracking-widest text-token-text-tertiary animate-pulse">
              Consultando bitácora maestra...
            </div>
          ) : (
            <ResponsiveView mobile={renderMobileView()} desktop={renderDesktopView()} />
          )}
        </div>
      </Card>
      <ExportLogsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />

      <AuditLogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default AuditLogsView;
