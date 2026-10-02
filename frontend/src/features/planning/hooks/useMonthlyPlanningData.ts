interface UseMonthlyPlanningDataParams {
  isEmbedded?: boolean;
}

export const useMonthlyPlanningData = ({ isEmbedded }: UseMonthlyPlanningDataParams = {}) => {
  return {
    isEmbedded,
    title: "Planificación Mensual",
    subtitle: "Gestión estratégica de turnos y dotación",
  };
};
