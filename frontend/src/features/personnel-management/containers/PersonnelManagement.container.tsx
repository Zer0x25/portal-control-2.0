import React, { useEffect } from "react";
import { useSearchParams } from "react-router";
import type { ActivePersonnelTab } from "../hooks/usePersonnelManagementData";
import { usePersonnelManagementData } from "../hooks/usePersonnelManagementData";
import { PersonnelManagementView } from "../views/PersonnelManagement.view";
import { EmployeeManagementContainer } from "../../employee-management/containers/EmployeeManagement.container";
import { UserManagementContainer } from "../../user-management/containers/UserManagement.container";
import { useAuth } from "../../../hooks/useAuth";
import { ROLES } from "../../../utils/mappings";

export const PersonnelManagementContainer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const canManageUsers =
    currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.SUPERVISOR_ELEVATED;
  const requestedTab = searchParams.get("tab");
  const defaultTab: ActivePersonnelTab =
    requestedTab === "users" && canManageUsers ? "users" : "employees";
  const logic = usePersonnelManagementData({ defaultTab });
  const activeTab = canManageUsers ? logic.activeTab : "employees";

  useEffect(() => {
    if (requestedTab !== "users" || canManageUsers) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "employees");
    setSearchParams(nextParams, { replace: true });
  }, [canManageUsers, requestedTab, searchParams, setSearchParams]);

  const setActiveTab = (tab: ActivePersonnelTab) => {
    if (tab === "users" && !canManageUsers) return;
    logic.setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    setSearchParams(nextParams);
  };

  return (
    <PersonnelManagementView
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      showUsersTab={canManageUsers}
      employeesContent={<EmployeeManagementContainer isEmbedded />}
      usersContent={canManageUsers ? <UserManagementContainer isEmbedded /> : null}
    />
  );
};
