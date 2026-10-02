import React from "react";
import {
  ActivePersonnelTab,
  usePersonnelManagementData,
} from "../hooks/usePersonnelManagementData";
import { PersonnelManagementView } from "../views/PersonnelManagement.view";
import { EmployeeManagementContainer } from "../../employee-management/containers/EmployeeManagement.container";
import { UserManagementContainer } from "../../user-management/containers/UserManagement.container";

interface PersonnelManagementContainerProps {
  defaultTab?: ActivePersonnelTab;
}

export const PersonnelManagementContainer: React.FC<PersonnelManagementContainerProps> = ({
  defaultTab,
}) => {
  const logic = usePersonnelManagementData({ defaultTab });
  return (
    <PersonnelManagementView
      {...logic}
      employeesContent={<EmployeeManagementContainer isEmbedded />}
      usersContent={<UserManagementContainer isEmbedded />}
    />
  );
};
