import React, { useState, useMemo } from "react";
import KpiCard, { KpiStat, KpiStatProps } from "../../../components/ui/KpiCard";
import { CalendarDaysIcon } from "../../../components/ui/icons/index";
import LiveStatusPanel from "./LiveStatusPanel";
import EmployeeCalendarModal from "./EmployeeCalendarModal";
import { motion, AnimatePresence } from "framer-motion";
import { Employee, EmployeeWithClockingStatus } from "../../../types/index";
import { useDashboardOverviewQuery } from "../../../hooks/queries/useDashboardQueries";

/**
 * 🏢 OverviewTab: Resumen Operativo Industrial
 * Limpieza técnica y unificación estética
 */
const OverviewTab: React.FC = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["all"]);
  const [selectedEmployeeForCalendar, setSelectedEmployeeForCalendar] = useState<Employee | null>(
    null,
  );

  const { data: overviewData } = useDashboardOverviewQuery();

  const employeesWithStatus = useMemo<EmployeeWithClockingStatus[]>(() => {
    return overviewData?.employeeStatuses || [];
  }, [overviewData]);

  const stats = useMemo(() => {
    const counts = {
      scheduled: 0,
      working: 0,
      onBreak: 0,
      pending: 0,
      absent: 0,
      finished: 0,
      dayOff: 0,
    };

    employeesWithStatus.forEach((s) => {
      if (
        [
          "en_jornada",
          "en_jornada_post_colacion",
          "en_colacion",
          "por_iniciar",
          "ausente",
          "terminada",
          "jornada_terminada_anomalia",
        ].includes(s.status)
      ) {
        counts.scheduled++;
      }

      if (s.status === "en_jornada" || s.status === "en_jornada_post_colacion") counts.working++;
      else if (s.status === "en_colacion") counts.onBreak++;
      else if (s.status === "por_iniciar") counts.pending++;
      else if (s.status === "ausente") counts.absent++;
      else if (s.status === "terminada" || s.status === "jornada_terminada_anomalia")
        counts.finished++;
      else if (s.status === "no_programado") counts.dayOff++;
    });

    return counts;
  }, [employeesWithStatus]);

  const planningKpis: KpiStatProps[] = [
    {
      value: stats.scheduled,
      label: "Total Programados Hoy",
      onClick: () =>
        setSelectedStatuses([
          "en_jornada",
          "en_jornada_post_colacion",
          "en_colacion",
          "por_iniciar",
          "ausente",
          "terminada",
          "jornada_terminada_anomalia",
        ]),
      isActive: selectedStatuses.length > 5,
    },
    {
      value: stats.working,
      label: "Personal en Jornada",
      onClick: () => setSelectedStatuses(["en_jornada", "en_jornada_post_colacion"]),
      isActive: selectedStatuses.includes("en_jornada") && selectedStatuses.length === 2,
    },
    {
      value: stats.onBreak,
      label: "Personal en Colación",
      onClick: () => setSelectedStatuses(["en_colacion"]),
      isActive: selectedStatuses.includes("en_colacion") && selectedStatuses.length === 1,
    },
    {
      value: stats.pending,
      label: "Pendientes por Iniciar",
      onClick: () => setSelectedStatuses(["por_iniciar"]),
      isActive: selectedStatuses.includes("por_iniciar") && selectedStatuses.length === 1,
    },
    {
      value: stats.absent,
      label: "Ausencias / Licencias",
      onClick: () => setSelectedStatuses(["ausente"]),
      isActive: selectedStatuses.includes("ausente") && selectedStatuses.length === 1,
    },
    {
      value: stats.finished,
      label: "Jornadas Finalizadas",
      onClick: () => setSelectedStatuses(["terminada", "jornada_terminada_anomalia"]),
      isActive: selectedStatuses.includes("terminada") && selectedStatuses.length === 2,
    },
    {
      value: stats.dayOff,
      label: "Día Descanso (No Prog.)",
      onClick: () => setSelectedStatuses(["no_programado"]),
      isActive: selectedStatuses.includes("no_programado") && selectedStatuses.length === 1,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pt-4">
      {/* 📊 Matrix Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4">
          <KpiCard title="Planificación del Día" icon={<CalendarDaysIcon />} className="h-full">
            <div className="space-y-2 mt-4">
              {planningKpis.map((stat) => (
                <KpiStat key={stat.label} {...stat} />
              ))}
            </div>
          </KpiCard>
        </div>

        <div className="lg:col-span-8">
          <LiveStatusPanel
            selectedStatuses={selectedStatuses}
            onStatusesChange={setSelectedStatuses}
            employeesWithStatus={employeesWithStatus}
            onEmployeeClick={setSelectedEmployeeForCalendar}
          />
        </div>
      </div>

      <AnimatePresence>
        {selectedEmployeeForCalendar && (
          <EmployeeCalendarModal
            employee={selectedEmployeeForCalendar}
            isOpen={!!selectedEmployeeForCalendar}
            onClose={() => setSelectedEmployeeForCalendar(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OverviewTab;
