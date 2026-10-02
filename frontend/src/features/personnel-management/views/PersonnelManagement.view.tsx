import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "../../../components/ui/PageHeader";
import TabNav from "../../../components/ui/TabNav";
import { UsersIcon } from "../../../components/ui/icons";
import { ActivePersonnelTab } from "../hooks/usePersonnelManagementData";

export interface PersonnelManagementViewProps {
  activeTab: ActivePersonnelTab;
  setActiveTab: (tab: ActivePersonnelTab) => void;
  employeesContent: React.ReactNode;
  usersContent: React.ReactNode;
}

/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL
   Presentational layer for Personnel Management.
*/
export const PersonnelManagementView: React.FC<PersonnelManagementViewProps> = ({
  activeTab,
  setActiveTab,
  employeesContent,
  usersContent,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 animate-in fade-in duration-500"
      data-ui-protected
    >
      <PageHeader
        eyebrow="Recursos Humanos"
        eyebrowIcon={<UsersIcon className="w-3.5 h-3.5" />}
        icon={<UsersIcon className="w-4 h-4" />}
        title="Gestión de Personal"
        subtitle="Administración centralizada de trabajadores y cuentas"
      />

      <TabNav
        tabs={[
          { id: "employees", label: "Empleados" },
          { id: "users", label: "Accesos" },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as "employees" | "users")}
      />

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {activeTab === "employees" && employeesContent}
            {activeTab === "users" && usersContent}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
