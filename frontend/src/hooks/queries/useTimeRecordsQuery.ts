import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeRecordService } from "../../services/timeRecordService";
import { leaveService } from "../../services/leaveService";
import { AttendanceRecord, DailyTimeRecord } from "../../types/index";
import { LeaveRecord } from "../../types/scheduling";
import { useToasts } from "../useToasts";
import { useEffect, useState } from "react";
import { idbGetAll, idbPutBulk, STORES } from "../../utils/indexedDB";

export interface TimeRecordsFilterParams {
  pageSize: number;
  filters: {
    desde?: string;
    hasta?: string;
    name?: string;
    employeeId?: string; // Phase 5: Support direct filtering
    area?: string;
    workdayType?: string;
    status?: string;
    showAnomalies?: boolean;
  };
}

// --- Query --
export const useTimeRecordsQuery = (params: TimeRecordsFilterParams) => {
  const [cachedData, setCachedData] = useState<AttendanceRecord[] | null>(null);

  const buildCachedPage = (source: AttendanceRecord[], page: number) => {
    const { desde, hasta, name, employeeId, area, workdayType, status, showAnomalies } =
      params.filters || {};

    const filtered = source.filter((r) => {
      if (desde && r.date < desde) return false;
      if (hasta && r.date > hasta) return false;
      if (employeeId && r.employeeId !== employeeId) return false;
      if (area && r.employeeArea !== area) return false;
      if (workdayType && workdayType !== "TODOS" && r.employeeWorkdayType !== workdayType)
        return false;
      if (status && r.status !== status) return false;
      if (showAnomalies && !["AnomaliaManual", "SinMarcajeTurnoAsignado"].includes(r.status))
        return false;
      if (name && !r.employeeName.toLowerCase().includes(name.toLowerCase())) return false;
      return true;
    });

    const pageSize = params.pageSize;
    if (pageSize <= 0) {
      return {
        data: filtered,
        total: filtered.length,
        totalPages: 1,
        page: 1,
      };
    }

    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      page,
    };
  };

  const getCachedPage = async (page: number) => {
    if (cachedData && cachedData.length > 0) {
      return buildCachedPage(cachedData, page);
    }

    const local = await idbGetAll<AttendanceRecord>(STORES.DAILY_TIME_RECORDS);
    if (!local || local.length === 0) return null;

    const sorted = [...local].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    setCachedData(sorted);
    return buildCachedPage(sorted, page);
  };

  useEffect(() => {
    idbGetAll<AttendanceRecord>(STORES.DAILY_TIME_RECORDS).then((data) => {
      if (data && data.length > 0) {
        // Sort by date descending for better initial view
        const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCachedData(sorted);
      }
    });
  }, []);

  return useInfiniteQuery({
    queryKey: ["timeRecords", params],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const result = await timeRecordService.getAll({
          ...params,
          page: pageParam as number,
        });

        // Background persistence to IDB
        if (result.data && result.data.length > 0 && params.filters?.showAnomalies !== true) {
          idbPutBulk(STORES.DAILY_TIME_RECORDS, result.data, true).catch((err) =>
            console.warn("Failed to persist time records to IDB:", err),
          );
        }

        // Inject page number if not present in response
        return {
          ...result,
          page: pageParam as number,
        };
      } catch (error) {
        const cachedPage = await getCachedPage(pageParam as number);
        if (cachedPage) return cachedPage;
        throw error;
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    placeholderData: (previousData) => {
      if (previousData) return previousData;
      if (cachedData && cachedData.length > 0) {
        const cachedPage = buildCachedPage(cachedData, 1);
        return {
          pages: [cachedPage],
          pageParams: [1],
        };
      }
      return undefined;
    },
    staleTime: 1000 * 60, // 1 minute fresh
  });
};

export const useUserClockingStatus = (employeeId?: string) => {
  const query = useQuery({
    queryKey: ["timeRecords", "last", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      // Fetch only the latest record for this employee
      const result = await timeRecordService.getAll({
        page: 1,
        pageSize: 1,
        filters: { employeeId },
      });
      return result.data[0] || null;
    },
    enabled: !!employeeId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute auto-refresh
  });

  const lastRecord = query.data;
  let status: "in" | "out" | "not_employee" | "unknown";
  let time = "";

  if (!employeeId) {
    status = "not_employee";
  } else if (query.isLoading) {
    status = "unknown";
  } else if (lastRecord) {
    if (!lastRecord.salida) {
      status = "in";
      time = lastRecord.entrada?.split("T")[1]?.substring(0, 5) || "";
    } else {
      status = "out";
      time = lastRecord.salida?.split("T")[1]?.substring(0, 5) || "";
    }
  } else {
    status = "out"; // No records ever
  }

  return { status, time, lastRecord, isLoading: query.isLoading };
};

// --- Mutations ---
export const useTimeRecordMutations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  type CreateLeavePayload = Omit<LeaveRecord, "id" | "lastModified" | "syncStatus" | "isDeleted">;

  const punchMutation = useMutation({
    mutationFn: async (data: {
      employeeId: string;
      source?: string;
      forcedType?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const geolocation =
        typeof data.latitude === "number" && typeof data.longitude === "number"
          ? { latitude: data.latitude, longitude: data.longitude }
          : undefined;
      return await timeRecordService.punch(
        data.employeeId,
        data.source,
        data.forcedType,
        geolocation,
      );
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate both lists and dashboard
        queryClient.invalidateQueries({ queryKey: ["timeRecords"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["employees"] }); // Emps status changes
      } else {
        addToast("Error al marcar", "error");
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Error de conexión";
      addToast(message, "error");
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: async (record: DailyTimeRecord) => {
      return await timeRecordService.save(record);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeRecords"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addToast("Registro actualizado", "success");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Error al actualizar registro";
      addToast(message, "error");
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      return await timeRecordService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeRecords"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addToast("Registro eliminado", "success");
    },
    onError: () => {
      addToast("Error al eliminar registro", "error");
    },
  });

  const createLeaveMutation = useMutation({
    mutationFn: async (data: CreateLeavePayload) => {
      return await leaveService.createLeave(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeRecords"] });
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      addToast("Licencia/Permiso registrado", "success");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Error al registrar licencia";
      addToast(message, "error");
    },
  });

  const resolveAnomalyMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      resolution:
        "ABSENCE_MARK" | "SHIFT_HOURS_ACK" | "PERMIT_MARK" | "DAY_OFF_MARK" | "VACATION_MARK";
    }) => {
      return await timeRecordService.resolveAnomaly(data.id, data.resolution);
    },
    onSuccess: (_record) => {
      queryClient.invalidateQueries({ queryKey: ["timeRecords"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addToast("Anomalía resuelta", "success");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Error al resolver anomalía";
      addToast(message, "error");
    },
  });

  return {
    punchMutation,
    updateRecordMutation,
    deleteRecordMutation,
    createLeaveMutation,
    resolveAnomalyMutation,
  };
};
