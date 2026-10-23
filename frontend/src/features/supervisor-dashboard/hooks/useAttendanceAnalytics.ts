import { useBusinessNow } from "../../../hooks/useBusinessNow";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { SUPERVISOR_DASHBOARD_CONFIG } from "../config/performance";
import { timeRecordService } from "../../../services/timeRecordService";
import { queryKeys } from "../../../lib/queryKeys";

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
    queryKey: queryKeys.attendanceAnalytics(startDate, endDate),
    queryFn: async (): Promise<AttendanceData[]> => {
      // Agregado en servidor (una sola request de ~30 filas) en vez del
      // volcado paginado completo (~6MB) con agregación en cliente.
      return timeRecordService.getDailyAttendance({ desde: startDate, hasta: endDate });
    },
    ...SUPERVISOR_DASHBOARD_CONFIG.analyticsCache,
  });

  const stats = (() => {
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
  })() as AttendanceStats | null;

  const trends = (() => {
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
  })();

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

  const trends = (() => {
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
  })();

  return {
    trends,
    isLoading,
  };
}
