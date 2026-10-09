import React from "react";
import PageHeader from "../../../components/ui/PageHeader";
import Container from "../../../components/ui/Container";
import {
  CalendarDaysIcon,
  TableCellsIcon,
  UsersIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
} from "../../../components/ui/icons";
import LazySectionFallback from "../../../components/ui/LazySectionFallback";

const PatternManager = React.lazy(() => import("../components/PatternManager"));
const AssignmentManager = React.lazy(() => import("../components/AssignmentManager"));
const LeaveManager = React.lazy(() => import("../components/LeaveManager"));
const HolidayManager = React.lazy(() => import("../components/HolidayManager"));

export type TheoreticalShiftsTabId = "patterns" | "assignments" | "leaves" | "holidays";

export interface TheoreticalShiftsViewProps {
  activeTab: TheoreticalShiftsTabId;
  handleTabChange: (id: TheoreticalShiftsTabId) => void;
}

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Theoretical Shifts.
*/
export const TheoreticalShiftsView: React.FC<TheoreticalShiftsViewProps> = ({
  activeTab,
  handleTabChange,
}) => {
  const tabs: Array<{
    id: TheoreticalShiftsTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "patterns", label: "Patrones", icon: TableCellsIcon },
    { id: "assignments", label: "Asignación", icon: UsersIcon },
    { id: "leaves", label: "Permisos", icon: ClipboardDocumentCheckIcon },
    { id: "holidays", label: "Festivos", icon: SparklesIcon },
  ];

  return (
    <Container variant="wide" noPadding data-ui-protected className="space-y-6">
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader
          eyebrow="Configuración"
          eyebrowIcon={<CalendarDaysIcon className="w-3.5 h-3.5" />}
          icon={<CalendarDaysIcon className="w-4 h-4" />}
          title="Matriz de Turnos"
          subtitle="Configuración maestra de horarios y jornadas operativas"
        />

        <div className="flex border-b border-token-border-technical gap-8 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-4 px-1 flex items-center gap-2.5 transition-colors relative ${
                    isActive
                      ? "text-(--sidebar-text-active)"
                      : "text-token-text-tertiary hover:text-token-text-primary"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-60"}`} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--sidebar-text-active) shadow-[0_-2px_8px_rgba(var(--sidebar-text-active-rgb),0.3)] animate-in fade-in" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <React.Suspense fallback={<LazySectionFallback rows={6} />}>
            {activeTab === "patterns" && <PatternManager />}
            {activeTab === "assignments" && <AssignmentManager />}
            {activeTab === "leaves" && <LeaveManager />}
            {activeTab === "holidays" && <HolidayManager />}
          </React.Suspense>
        </div>
      </div>
    </Container>
  );
};
