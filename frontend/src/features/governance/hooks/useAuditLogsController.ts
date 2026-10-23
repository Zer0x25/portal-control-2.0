import { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AuditLog } from "../../../types/index";
import { useDebounce } from "../../../hooks/useDebounce";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { startOfMonth, endOfMonth, format } from "date-fns";
import {
  useAuditLogsInfinite,
  AuditLogsFilterParams,
} from "../../../hooks/queries/useAuditLogsInfinite";

const DESKTOP_PAGE_SIZE = 100;
const MOBILE_PAGE_SIZE = 20;
const ROW_HEIGHT_DESKTOP = 48;
const ROW_HEIGHT_MOBILE = 90;

export const useAuditLogsController = () => {
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

  // TanStack Virtual is intentionally a compiler bail-out; keep the virtualizer's instance API local.
  // eslint-disable-next-line react-hooks/incompatible-library -- the compiler cannot safely memoize Virtualizer methods
  const rowVirtualizer = useVirtualizer({
    count: allLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP),
    overscan: 10,
  });

  // Se calcula en el controller (compiler bail-out de `useVirtualizer`) y se
  // pasa como prop: si la vista compilada llamara `getVirtualItems()` inline,
  // React Compiler memoizaría el JSX con el array vacío del primer render y
  // la lista nunca se pintaría cuando el virtualizer mide el scroll.
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastVirtualItemIndex = virtualItems.at(-1)?.index ?? -1;

  useEffect(() => {
    if (lastVirtualItemIndex >= allLogs.length - 5 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, allLogs.length, fetchNextPage, lastVirtualItemIndex]);

  return {
    isMobile,
    businessNow,
    isExportModalOpen,
    setIsExportModalOpen,
    isFiltersOpen,
    setIsFiltersOpen,
    activeDate,
    setActiveDate,
    selectedLog,
    setSelectedLog,
    filters,
    setFilters,
    debouncedFilters,
    queryParams,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    allLogs,
    totalLogs,
    parentRef,
    rowVirtualizer,
    virtualItems,
  };
};

export type AuditLogsController = ReturnType<typeof useAuditLogsController>;
