import { useEffect, useState } from "react";

export type ActivePersonnelTab = "employees" | "users";

interface UsePersonnelManagementDataParams {
  defaultTab?: ActivePersonnelTab;
}

export const usePersonnelManagementData = ({
  defaultTab = "employees",
}: UsePersonnelManagementDataParams = {}) => {
  const [activeTab, setActiveTab] = useState<ActivePersonnelTab>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  return {
    activeTab,
    setActiveTab,
  };
};
