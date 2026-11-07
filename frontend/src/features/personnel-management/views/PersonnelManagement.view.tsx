import React from "react";
import PageHeader from "../../../components/ui/PageHeader";
import Container from "../../../components/ui/Container";
import TabNav from "../../../components/ui/TabNav";
import { UsersIcon } from "../../../components/ui/icons";
import { ActivePersonnelTab } from "../hooks/usePersonnelManagementData";

export interface PersonnelManagementViewProps {
  activeTab: ActivePersonnelTab;
  setActiveTab: (tab: ActivePersonnelTab) => void;
  showUsersTab?: boolean;
  employeesContent: React.ReactNode;
  usersContent: React.ReactNode;
}

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Personnel Management.
*/
export const PersonnelManagementView: React.FC<PersonnelManagementViewProps> = ({
  activeTab,
  setActiveTab,
  showUsersTab = true,
  employeesContent,
  usersContent,
}) => {
  return (
    <Container variant="wide" noPadding data-ui-protected className="space-y-6">
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader
          eyebrow="Recursos Humanos"
          eyebrowIcon={<UsersIcon className="w-3.5 h-3.5" />}
          icon={<UsersIcon className="w-4 h-4" />}
          title="Gestión de Personal"
          subtitle="Administración centralizada de trabajadores y cuentas"
        />

        {showUsersTab && (
          <TabNav
            tabs={[
              { id: "employees", label: "Empleados" },
              { id: "users", label: "Accesos" },
            ]}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as ActivePersonnelTab)}
          />
        )}

        <div className="relative">
          <div key={activeTab} className="animate-in fade-in slide-in-from-right-2">
            {activeTab === "employees" && employeesContent}
            {activeTab === "users" && usersContent}
          </div>
        </div>
      </div>
    </Container>
  );
};
