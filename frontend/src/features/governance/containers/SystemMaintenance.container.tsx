import React from "react";
import { useSystemMaintenanceController } from "../hooks/useSystemMaintenanceController";
import { SystemMaintenanceView } from "../views/SystemMaintenance.view";

const SystemMaintenanceContainer: React.FC = () => {
  const logic = useSystemMaintenanceController();
  return <SystemMaintenanceView {...logic} />;
};

export default SystemMaintenanceContainer;
