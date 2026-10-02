import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type GovernanceTabId = "integrity" | "security" | "audit" | "system" | "health";

interface UseGovernanceDataParams {
  defaultTab?: GovernanceTabId;
}

const VALID_TABS: GovernanceTabId[] = ["integrity", "security", "audit", "system", "health"];

const isGovernanceTabId = (value: string | null): value is GovernanceTabId => {
  return value !== null && VALID_TABS.includes(value as GovernanceTabId);
};

export const useGovernanceData = ({ defaultTab = "integrity" }: UseGovernanceDataParams = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<GovernanceTabId>(
    isGovernanceTabId(tabParam) ? tabParam : defaultTab,
  );

  useEffect(() => {
    if (isGovernanceTabId(tabParam)) {
      setActiveTab(tabParam);
      return;
    }

    setActiveTab(defaultTab);
  }, [tabParam, defaultTab]);

  const handleTabChange = (tabId: GovernanceTabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return {
    activeTab,
    handleTabChange,
  };
};
