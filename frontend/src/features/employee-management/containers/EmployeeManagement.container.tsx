import React from "react";
import { useEmployeeManagementData } from "../hooks/useEmployeeManagementData";
import { EmployeeManagementView } from "../views/EmployeeManagement.view";

interface EmployeeManagementContainerProps {
  isEmbedded?: boolean;
}

export const EmployeeManagementContainer: React.FC<EmployeeManagementContainerProps> = ({
  isEmbedded,
}) => {
  const logic = useEmployeeManagementData({ isEmbedded });
  return <EmployeeManagementView {...logic} />;
};
