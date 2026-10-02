import React from "react";
import { useMeterReadingsData } from "../hooks/useMeterReadingsData";
import { MeterReadingsView } from "../views/MeterReadings.view";

export const MeterReadingsContainer: React.FC = () => {
  const logic = useMeterReadingsData();
  return <MeterReadingsView {...logic} />;
};
