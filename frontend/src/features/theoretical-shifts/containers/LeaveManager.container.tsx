import React from "react";
import { useLeaveManagerController } from "../hooks/useLeaveManagerController";
import { LeaveManagerView } from "../views/LeaveManager.view";

const LeaveManagerContainer: React.FC = () => {
  const logic = useLeaveManagerController();
  return <LeaveManagerView {...logic} />;
};

export default LeaveManagerContainer;
