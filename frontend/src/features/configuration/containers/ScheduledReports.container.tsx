import React from "react";
import { useScheduledReportsController } from "../hooks/useScheduledReportsController";
import { ScheduledReportsView } from "../views/ScheduledReports.view";

const ScheduledReportsContainer: React.FC = () => {
  const controller = useScheduledReportsController();
  return <ScheduledReportsView {...controller} />;
};

export default ScheduledReportsContainer;
