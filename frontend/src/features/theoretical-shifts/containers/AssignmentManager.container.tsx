import React from "react";
import { useAssignmentManagerController } from "../hooks/useAssignmentManagerController";
import { AssignmentManagerView } from "../views/AssignmentManager.view";

const AssignmentManagerContainer: React.FC = () => {
  const logic = useAssignmentManagerController();
  return <AssignmentManagerView {...logic} />;
};

export default AssignmentManagerContainer;
