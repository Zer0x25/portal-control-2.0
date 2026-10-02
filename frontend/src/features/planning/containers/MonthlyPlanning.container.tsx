import React from "react";
import { useMonthlyPlanningData } from "../hooks/useMonthlyPlanningData";
import { MonthlyPlanningView } from "../views/MonthlyPlanning.view";

interface MonthlyPlanningContainerProps {
  isEmbedded?: boolean;
}

export const MonthlyPlanningContainer: React.FC<MonthlyPlanningContainerProps> = ({
  isEmbedded,
}) => {
  const logic = useMonthlyPlanningData({ isEmbedded });
  return <MonthlyPlanningView {...logic} />;
};
