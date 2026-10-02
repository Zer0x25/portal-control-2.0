import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type ConfigTabId = "variables" | "email" | "master-data";

interface UseConfigurationDataParams {
  defaultTab?: ConfigTabId;
}

const VALID_TABS: ConfigTabId[] = ["variables", "email", "master-data"];

const isConfigTabId = (value: string | null): value is ConfigTabId => {
  return value !== null && VALID_TABS.includes(value as ConfigTabId);
};

export const useConfigurationData = ({
  defaultTab = "variables",
}: UseConfigurationDataParams = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<ConfigTabId>(
    isConfigTabId(tabParam) ? tabParam : defaultTab,
  );

  useEffect(() => {
    if (isConfigTabId(tabParam)) {
      setActiveTab(tabParam);
      return;
    }

    setActiveTab(defaultTab);
  }, [tabParam, defaultTab]);

  const handleTabChange = (tabId: ConfigTabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return {
    activeTab,
    handleTabChange,
  };
};
