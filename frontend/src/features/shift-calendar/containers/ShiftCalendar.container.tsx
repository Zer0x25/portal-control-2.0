import React from "react";
import { useShiftCalendarData } from "../hooks/useShiftCalendarData";
import { ShiftCalendarFeatureView } from "../views/ShiftCalendar.view";

export const ShiftCalendarContainer: React.FC = () => {
  const logic = useShiftCalendarData();
  return <ShiftCalendarFeatureView {...logic} />;
};
