import React, { useMemo } from "react";
import KpiFilterPanel from "./KpiFilterPanel";
import KpiCard, { KpiStat } from "../../../components/ui/KpiCard";
import {
  ClockIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
} from "../../../components/ui/icons/index";
import { motion, AnimatePresence } from "framer-motion";
import KpiDetailsModal from "./KpiDetailsModal";
import LoadingOverlay from "../../../components/ui/LoadingOverlay";
import { useKpisLogic } from "../hooks/useKpisLogic";

/**
 * 📈 KpisTab: Análisis Operativo de Alto Nivel
 * Refactored for Industrial-Elegant "DIV clean" interface.
 * Logic/UI separation: Pure UI component using useKpisLogic hook.
 * Optimizado con memoización para mejor performance
 */
const KpisTab: React.FC = React.memo(() => {
  const {
    isDateRangeInvalid,
    isDetailsModalOpen,
    modalData,
    isLoadingKpis,
    isNoDataPeriod,
    kpis,
    kpiDetails,
    kpiMetrics,
    handleFiltersChange,
    handleKpiClick,
    closeModal,
  } = useKpisLogic();

  // Memoizar configuración de animaciones para evitar recreación
  const animationConfig = useMemo(
    () => ({
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.98 },
    }),
    [],
  );

  return (
    <div className="space-y-8 relative min-h-[500px] pt-4">
      <KpiFilterPanel onFiltersChange={handleFiltersChange} isLoading={isLoadingKpis} />

      <AnimatePresence mode="wait">
        {isDateRangeInvalid ? (
          <motion.div
            key="error"
            {...animationConfig}
            className="flex flex-col items-center justify-center p-16 bg-rose-500/[0.03] border border-rose-500/20 rounded-sm"
          >
            <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mb-5">
              <ExclamationTriangleIcon className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-[13px] font-bold text-rose-600 uppercase tracking-widest">
              Parámetros de Tiempo Inválidos
            </h3>
            <p className="text-[11px] font-semibold text-rose-400 mt-2 uppercase tracking-wide">
              El segmento cronológico de inicio es superior al de término
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="kpis-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <AnimatePresence>
              {isLoadingKpis && (
                <LoadingOverlay message="CALIBRANDO MÉTRICAS TÉCNICAS..." fullScreen={false} />
              )}
            </AnimatePresence>

            {isNoDataPeriod && (
              <div className="mb-8 rounded-sm border border-amber-200 bg-amber-500/10 px-6 py-4 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                  Periodo sin registros: No hay data operativa disponible en la ventana
                  seleccionada.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8">
                <KpiCard title="Asistencia y Puntualidad" icon={<ClockIcon />} className="h-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <KpiStat
                      value={kpis.tardinessCount}
                      label="Registros con Atraso"
                      onClick={() =>
                        handleKpiClick("Detalle de Atrasos", kpiDetails.tardyRecords, "record")
                      }
                    />
                    <KpiStat
                      value={kpis.absenceCount}
                      label="Ausencias Detectadas"
                      onClick={() =>
                        handleKpiClick(
                          "Detalle de Ausencias",
                          kpiDetails.absentEmployees,
                          "employee",
                        )
                      }
                    />
                    <KpiStat
                      value={kpis.vacationCount}
                      label="Días de Vacaciones"
                      onClick={() =>
                        handleKpiClick(
                          "Detalle de Vacaciones",
                          kpiDetails.vacationRecords,
                          "justification",
                        )
                      }
                    />
                    <KpiStat
                      value={kpis.medicalLeaveCount}
                      label="Licencias Médicas"
                      onClick={() =>
                        handleKpiClick(
                          "Detalle de Licencias Médicas",
                          kpiDetails.medicalLeaveRecords,
                          "justification",
                        )
                      }
                    />
                    <div className="sm:col-span-2">
                      <KpiStat
                        value={kpis.specialPermitCount}
                        label="Permisos Especiales Vigentes"
                        onClick={() =>
                          handleKpiClick(
                            "Detalle de Permisos Especiales",
                            kpiDetails.specialPermitRecords,
                            "justification",
                          )
                        }
                      />
                    </div>
                  </div>
                </KpiCard>
              </div>

              <div className="lg:col-span-4">
                <KpiCard
                  title="Eficiencia Horaria"
                  icon={<DocumentChartBarIcon />}
                  className="h-full"
                >
                  <div className="space-y-3 mt-2">
                    {kpiMetrics.map((stat) => (
                      <KpiStat key={stat.label} value={stat.value} label={stat.label} />
                    ))}
                  </div>
                </KpiCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <KpiDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeModal}
        title={modalData?.title || ""}
        data={modalData?.data || []}
        dataType={modalData?.type || "record"}
      />
    </div>
  );
});

KpisTab.displayName = "KpisTab";

export default KpisTab;
