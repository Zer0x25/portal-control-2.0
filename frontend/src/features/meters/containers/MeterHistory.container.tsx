import React from "react";
import MeterHistoryView from "../views/MeterHistory.view";
import { useMeterHistoryController } from "../hooks/useMeterHistoryController";

const MeterHistoryContainer: React.FC = () => {
  const controller = useMeterHistoryController();
  return <MeterHistoryView {...controller} />;
};

export default MeterHistoryContainer;
