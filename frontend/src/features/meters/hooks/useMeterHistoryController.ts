import { useState, useMemo, useRef, useEffect } from "react";
import { useMeterReadings } from "../../../hooks/useMeterReadings";
import { MeterConfig } from "../../../types";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { useMeterReadingsInfinite } from "../../../hooks/queries/useMeterReadingsInfinite";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import { useDebounce } from "../../../hooks/useDebounce";
import { formatDateUTCISO } from "../../../utils/dateUtils";

export const useMeterHistoryController = () => {
  const { readings: allReadingsForKpis, meterConfigs } = useMeterReadings();

  const [filters, setFilters] = useState({ meterId: "", startDate: "", endDate: "" });

  const [selectedMeterForInput, setSelectedMeterForInput] = useState<MeterConfig | null>(null);

  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);

  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const debouncedFilters = useDebounce(filters, 500);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMeterReadingsInfinite(debouncedFilters);

  const displayReadings = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const meterConfigById = useMemo(
    () => new Map(meterConfigs.map((config) => [config.id, config])),
    [meterConfigs],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  const entry = useIntersectionObserver(sentinelRef, { rootMargin: "200px" });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  };

  const kpiData = useMemo(() => {
    interface MeterKpiData {
      avgDaily: string;
      avgWeekly: string;
      avgMonthly: string;
      lastReadingValue: string;
      lastReadingUnit: string;
      lastReadingDate: string;
    }

    const data: Record<string, MeterKpiData> = {};

    meterConfigs.forEach((config) => {
      // Use allReadingsForKpis (sync store) for accurate KPI calculation
      const meterReadings = allReadingsForKpis
        .filter(
          (r) => r.meterConfigId === config.id && r.eventType === "CONSUMPTION" && r.delta < 0,
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      if (meterReadings.length < 1) {
        const lastReading = allReadingsForKpis.find((r) => r.meterConfigId === config.id);
        data[config.id] = {
          avgDaily: "N/A",
          avgWeekly: "N/A",
          avgMonthly: "N/A",
          lastReadingValue: lastReading ? lastReading.normalizedValue.toFixed(2) : "N/A",
          lastReadingUnit: lastReading ? config.unit : "",
          lastReadingDate: lastReading
            ? new Date(lastReading.timestamp).toLocaleDateString("es-CL")
            : "N/A",
        };
        return;
      }

      const dailyConsumptions: Record<string, number> = {};
      const weeklyConsumptions: Record<string, number> = {};
      const monthlyConsumptions: Record<string, number> = {};

      meterReadings.forEach((r) => {
        const date = new Date(r.timestamp);
        const dayKey = formatDateUTCISO(date);
        const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

        const consumption = Math.abs(r.delta);

        dailyConsumptions[dayKey] = (dailyConsumptions[dayKey] || 0) + consumption;
        weeklyConsumptions[weekKey] = (weeklyConsumptions[weekKey] || 0) + consumption;
        monthlyConsumptions[monthKey] = (monthlyConsumptions[monthKey] || 0) + consumption;
      });

      const getAverage = (consumptions: Record<string, number>) => {
        const values = Object.values(consumptions);
        if (values.length === 0) return "N/A";
        const sum = values.reduce((acc, val) => acc + val, 0);
        return (sum / values.length).toFixed(2) + ` ${config.unit}/periodo`;
      };

      const lastReading = allReadingsForKpis.find((r) => r.meterConfigId === config.id);

      data[config.id] = {
        avgDaily: getAverage(dailyConsumptions),
        avgWeekly: getAverage(weeklyConsumptions),
        avgMonthly: getAverage(monthlyConsumptions),
        lastReadingValue: lastReading ? lastReading.normalizedValue.toFixed(2) : "N/A",
        lastReadingUnit: lastReading ? config.unit : "",
        lastReadingDate: lastReading
          ? new Date(lastReading.timestamp).toLocaleDateString("es-CL")
          : "N/A",
      };
    });

    return data;
  }, [allReadingsForKpis, meterConfigs]);

  const handleClearFilters = () => {
    setFilters({ meterId: "", startDate: "", endDate: "" });
  };

  return {
    allReadingsForKpis,
    meterConfigs,
    filters,
    setFilters,
    selectedMeterForInput,
    setSelectedMeterForInput,
    isStartDatePickerOpen,
    setIsStartDatePickerOpen,
    isEndDatePickerOpen,
    setIsEndDatePickerOpen,
    isMobile,
    debouncedFilters,
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    displayReadings,
    meterConfigById,
    sentinelRef,
    entry,
    getWeekNumber,
    kpiData,
    handleClearFilters,
  };
};

export type MeterHistoryController = ReturnType<typeof useMeterHistoryController>;
