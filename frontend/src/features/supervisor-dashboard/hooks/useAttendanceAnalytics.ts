import { useMemo } from "react";
import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { SUPERVISOR_DASHBOARD_CONFIG } from "../config/performance";
import { timeRecordService } from "../../../services/timeRecordService";
import { AttendanceRecord } from "../../../types";
import { parseBusinessDateCL, parseBusinessDateTimeCL } from "../../../utils/dateUtils";

interface AttendanceData {
  date: string;
  present: number;
  total: number;
  late: number;
}

interface AttendanceStats {
  totalDays: number;
  averageAttendance: number;
  averageLate: number;
  bestDay: {
    date: string;
    attendance: number;
  };
  worstDay: {
    date: string;
    attendance: number;
  };
}

const ABSENCE_STATUSES = new Set([
  "Ausente",
  "DiaLibre",
  "Vacaciones",
  "Permiso Especial",
  "Feriado",
]);
const ABSENCE_ATTENDANCE_STATUSES = new Set([
  "Ausente",
  "Vacaciones",
  "Permiso Especial",
  "Feriado",
  "DiaLibre",
]);
const LATE_TOLERANCE_MINUTES = 15;
const ISO_WITH_TIMEZONE_REGEX = /(Z|[+-]\d{2}:\d{2})$/;

const parseBusinessRecordDateTime = (date: string, value: string): Date => {
  if (ISO_WITH_TIMEZONE_REGEX.test(value)) {
    return parseISO(value);
  }

  const timePart = value.includes("T") ? value.split("T")[1] : value;
  if (!timePart) {
    return new Date(Number.NaN);
  }

  return parseBusinessDateTimeCL(date, timePart);
};

const isLateRecord = (record: AttendanceRecord): boolean => {
  if (typeof record.isLate === "boolean") return record.isLate;
  if (record.attendanceStatus === "Atraso") return true;
  if (!record.entrada || !record.scheduledStartTime) return false;

  const [scheduledHour, scheduledMinute] = record.scheduledStartTime.split(":");
  if (!scheduledHour || !scheduledMinute) return false;

  const scheduledAt = parseBusinessDateTimeCL(
    record.date,
    `${scheduledHour}:${scheduledMinute}:00`,
  );
  const enteredAt = parseBusinessRecordDateTime(record.date, record.entrada);

  if (Number.isNaN(scheduledAt.getTime()) || Number.isNaN(enteredAt.getTime())) return false;
  const toleranceMs = LATE_TOLERANCE_MINUTES * 60 * 1000;
  return enteredAt.getTime() > scheduledAt.getTime() + toleranceMs;
};

const buildAttendanceSeries = (
  records: AttendanceRecord[],
  startDate: string,
  endDate: string,
): AttendanceData[] => {
  const days = eachDayOfInterval({
    start: parseBusinessDateCL(startDate),
    end: parseBusinessDateCL(endDate),
  });

  const byDate = new Map<
    string,
    { totalEmployees: Set<string>; presentEmployees: Set<string>; lateEmployees: Set<string> }
  >();

  records.forEach((record) => {
    const key = record.date;
    if (!byDate.has(key)) {
      byDate.set(key, {
        totalEmployees: new Set<string>(),
        presentEmployees: new Set<string>(),
        lateEmployees: new Set<string>(),
      });
    }

    const bucket = byDate.get(key);
    if (!bucket) return;

    bucket.totalEmployees.add(record.employeeId);

    const isAbsentLike = record.attendanceStatus
      ? ABSENCE_ATTENDANCE_STATUSES.has(record.attendanceStatus)
      : ABSENCE_STATUSES.has(record.status);
    const isPresent = Boolean(record.entrada) && !isAbsentLike;

    if (isPresent) {
      bucket.presentEmployees.add(record.employeeId);
      if (isLateRecord(record)) {
        bucket.lateEmployees.add(record.employeeId);
      }
    }
  });

  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const bucket = byDate.get(key);

    if (!bucket) {
      return { date: key, present: 0, total: 0, late: 0 };
    }

    return {
      date: key,
      present: bucket.presentEmployees.size,
      total: bucket.totalEmployees.size,
      late: bucket.lateEmployees.size,
    };
  });
};

/**
 * Hook para obtener datos de asistencia histórica
 * Incluye estadísticas calculadas y datos para gráficos
 */
export function useAttendanceAnalytics(days: number = 30) {
  const businessNow = useBusinessNow();
  const endDate = format(businessNow, "yyyy-MM-dd");
  const startDate = format(subDays(businessNow, days - 1), "yyyy-MM-dd");

  const {
    data: attendanceData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["attendance-analytics", startDate, endDate],
    queryFn: async (): Promise<AttendanceData[]> => {
      const pageSize = 500;
      let page = 1;
      let totalPages: number;
      const records: AttendanceRecord[] = [];

      do {
        const response = await timeRecordService.getAll({
          page,
          pageSize,
          filters: {
            desde: startDate,
            hasta: endDate,
          },
        });

        records.push(...response.data);
        totalPages = response.totalPages || 1;
        page += 1;
      } while (page <= totalPages);

      return buildAttendanceSeries(records, startDate, endDate);
    },
    ...SUPERVISOR_DASHBOARD_CONFIG.analyticsCache,
  });

  const stats = useMemo<AttendanceStats | null>(() => {
    if (!attendanceData || attendanceData.length === 0) return null;

    const totalDays = attendanceData.length;
    const averageAttendance =
      attendanceData.reduce(
        (sum, day) => sum + (day.total > 0 ? (day.present / day.total) * 100 : 0),
        0,
      ) / totalDays;

    const averageLate = attendanceData.reduce((sum, day) => sum + day.late, 0) / totalDays;

    const bestDay = attendanceData.reduce(
      (best, day) => {
        const attendanceRate = day.total > 0 ? (day.present / day.total) * 100 : 0;
        return attendanceRate > best.attendance
          ? { date: day.date, attendance: attendanceRate }
          : best;
      },
      {
        date: attendanceData[0].date,
        attendance:
          attendanceData[0].total > 0
            ? (attendanceData[0].present / attendanceData[0].total) * 100
            : 0,
      },
    );

    const worstDay = attendanceData.reduce(
      (worst, day) => {
        const attendanceRate = day.total > 0 ? (day.present / day.total) * 100 : 0;
        return attendanceRate < worst.attendance
          ? { date: day.date, attendance: attendanceRate }
          : worst;
      },
      {
        date: attendanceData[0].date,
        attendance:
          attendanceData[0].total > 0
            ? (attendanceData[0].present / attendanceData[0].total) * 100
            : 0,
      },
    );

    return {
      totalDays,
      averageAttendance,
      averageLate,
      bestDay,
      worstDay,
    };
  }, [attendanceData]);

  const trends = useMemo(() => {
    if (!attendanceData || attendanceData.length < 7) return null;

    const recent = attendanceData.slice(-7);
    const previous = attendanceData.slice(-14, -7);

    const recentAvg =
      recent.reduce((sum, d) => sum + (d.total > 0 ? d.present / d.total : 0), 0) / recent.length;
    const previousAvg =
      previous.reduce((sum, d) => sum + (d.total > 0 ? d.present / d.total : 0), 0) /
      previous.length;

    const change = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      trend: change > 1 ? "up" : change < -1 ? "down" : "stable",
      change: Math.abs(change),
    };
  }, [attendanceData]);

  return {
    data: attendanceData,
    stats,
    trends,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook para obtener tendencias de asistencia
 * Calcula cambios porcentuales y patrones
 */
export function useAttendanceTrends(days: number = 30) {
  const { data, isLoading } = useAttendanceAnalytics(days);

  const trends = useMemo(() => {
    if (!data || data.length < 7) return null;

    const recent = data.slice(-7);
    const previous = data.slice(-14, -7);

    const recentAvg = recent.reduce((sum, day) => sum + day.present, 0) / recent.length;
    const previousAvg = previous.reduce((sum, day) => sum + day.present, 0) / previous.length;

    const changePercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      weeklyChange: changePercent,
      trend: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "stable",
      recentAverage: recentAvg,
      previousAverage: previousAvg,
    };
  }, [data]);

  return {
    trends,
    isLoading,
  };
}
