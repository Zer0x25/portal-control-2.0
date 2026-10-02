import React from "react";
import { useTheoreticalShiftsData } from "../hooks/useTheoreticalShiftsData";
import { TheoreticalShiftsView } from "../views/TheoreticalShifts.view";

export const TheoreticalShiftsContainer: React.FC = () => {
  const logic = useTheoreticalShiftsData();
  return <TheoreticalShiftsView {...logic} />;
};
