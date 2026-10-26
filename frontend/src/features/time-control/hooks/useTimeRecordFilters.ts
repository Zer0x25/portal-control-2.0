import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  addBusinessDaysChile,
  parseDateAsUTC,
  toBusinessDateChile,
} from "../../../utils/dateUtils";
import { isDateRangeValid } from "../../../utils/validation";
import { useToasts } from "../../../hooks/useToasts";
import { useBusinessNow } from "../../../hooks/useBusinessNow";

export type QuickFilterMode = "24h" | "week" | "month" | "todo";

const getTodayLocalString = (now: Date) => toBusinessDateChile(now);

const getYesterdayLocalString = (now: Date) => addBusinessDaysChile(toBusinessDateChile(now), -1);

const getQuickFilterRange = (mode: QuickFilterMode, now: Date) => {
  const today = getTodayLocalString(now);
  const yesterday = getYesterdayLocalString(now);

  if (mode === "24h") {
    return {
      is24h: true,
      desde: yesterday,
      hasta: today,
    };
  }

  if (mode === "week") {
    return {
      is24h: false,
      desde: addBusinessDaysChile(today, -6),
      hasta: today,
    };
  }

  if (mode === "month") {
    return {
      is24h: false,
      desde: addBusinessDaysChile(today, -30),
      hasta: today,
    };
  }

  return {
    is24h: false,
    desde: addBusinessDaysChile(today, -60),
    hasta: today,
  };
};

const getInitialDateFilters = (now: Date) => getQuickFilterRange("24h", now);

const isSameQuickFilterRange = (
  left: ReturnType<typeof getQuickFilterRange>,
  right: ReturnType<typeof getQuickFilterRange>,
) => left.is24h === right.is24h && left.desde === right.desde && left.hasta === right.hasta;

export const useTimeRecordFilters = () => {
  const businessNow = useBusinessNow({ tickMs: null });
  const { addToast } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clientFilters, setClientFilters] = useState({
    name: "",
    area: "",
    workdayType: "",
    status: "",
    showAnomalies: false,
  });
  const [dateFilters, setDateFilters] = useState(() => getInitialDateFilters(businessNow));
  const [appliedDateFilters, setAppliedDateFilters] = useState(() =>
    getInitialDateFilters(businessNow),
  );
  const [isApplyButtonEnabled, setIsApplyButtonEnabled] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterMode | null>("24h");

  const handleClientFilterChange = (updates: Partial<typeof clientFilters>) => {
    setClientFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleDateFilterChange = (updates: Partial<Omit<typeof dateFilters, "is24h">>) => {
    setDateFilters((prev) => ({ ...prev, ...updates, is24h: false }));
    setActiveQuickFilter(null);
    setIsApplyButtonEnabled(true);
  };

  const handleQuickFilterClick = (mode: QuickFilterMode) => {
    const newFilters = getQuickFilterRange(mode, businessNow);

    if (
      activeQuickFilter === mode &&
      !isApplyButtonEnabled &&
      isSameQuickFilterRange(dateFilters, newFilters) &&
      isSameQuickFilterRange(appliedDateFilters, newFilters)
    ) {
      return;
    }

    setDateFilters(newFilters);
    setAppliedDateFilters(newFilters);
    setActiveQuickFilter(mode);
    setIsApplyButtonEnabled(false);
  };

  const handleApplyCustomFilters = () => {
    if (!dateFilters.desde || !dateFilters.hasta) {
      addToast("Debe seleccionar una fecha de inicio y fin.", "error");
      return;
    }

    if (!isDateRangeValid(dateFilters.desde, dateFilters.hasta)) {
      addToast("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
      return;
    }

    setAppliedDateFilters(dateFilters);
    setIsApplyButtonEnabled(false);
  };

  const clearFilters = () => {
    setClientFilters({ name: "", area: "", workdayType: "", status: "", showAnomalies: false });
    const initialDates = getInitialDateFilters(businessNow);
    setDateFilters(initialDates);
    setAppliedDateFilters(initialDates);
    setActiveQuickFilter("24h");
    setIsApplyButtonEnabled(false);
  };

  const periodDisplayText = (() => {
    if (appliedDateFilters.is24h) {
      return "Últimas 24 horas";
    }

    if (appliedDateFilters.desde && appliedDateFilters.hasta) {
      const startDate = parseDateAsUTC(appliedDateFilters.desde);
      const endDate = parseDateAsUTC(appliedDateFilters.hasta);

      const startDay = startDate.getUTCDate();
      const endDay = endDate.getUTCDate();

      const monthYearFormatter = new Intl.DateTimeFormat("es-CL", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      const monthFormatter = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" });

      const startMonthYear = monthYearFormatter.format(startDate);
      const endMonthYear = monthYearFormatter.format(endDate);

      if (startMonthYear === endMonthYear) {
        if (startDay === endDay) {
          return `${startDay} de ${startMonthYear}`;
        }
        return `${startDay} al ${endDay} de ${startMonthYear}`;
      }

      return `${startDay} de ${monthFormatter.format(startDate)} al ${endDay} de ${endMonthYear}`;
    }

    return "Período no definido";
  })();

  useEffect(() => {
    const fromDate = searchParams.get("startDate");
    const toDate = searchParams.get("endDate");
    const show = searchParams.get("show");

    if (fromDate && toDate) {
      const newDateFilters = { desde: fromDate, hasta: toDate, is24h: false };
      setDateFilters(newDateFilters);
      setAppliedDateFilters(newDateFilters);
      setActiveQuickFilter(null);

      if (show === "anomalies") {
        setClientFilters((prev) => ({ ...prev, showAnomalies: true }));
        addToast("Mostrando anomalías para el período seleccionado.", "info");
      }

      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, addToast]);

  useEffect(() => {
    if (!activeQuickFilter) {
      return;
    }

    const syncedFilters = getQuickFilterRange(activeQuickFilter, businessNow);
    if (!isSameQuickFilterRange(dateFilters, syncedFilters)) {
      setDateFilters(syncedFilters);
    }
    if (!isSameQuickFilterRange(appliedDateFilters, syncedFilters)) {
      setAppliedDateFilters(syncedFilters);
    }
    if (isApplyButtonEnabled) {
      setIsApplyButtonEnabled(false);
    }
  }, [activeQuickFilter, businessNow, dateFilters, appliedDateFilters, isApplyButtonEnabled]);

  return {
    clientFilters,
    dateFilters,
    appliedDateFilters,
    activeQuickFilter,
    isApplyButtonEnabled,
    periodDisplayText,
    handleClientFilterChange,
    handleDateFilterChange,
    handleQuickFilterClick,
    handleApplyCustomFilters,
    clearFilters,
  };
};
