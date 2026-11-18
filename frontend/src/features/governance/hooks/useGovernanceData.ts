import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../../../hooks/useAuth";
import { ROLES } from "../../../utils/mappings";

export type GovernanceTabId = "integrity" | "security" | "audit" | "system" | "health";

interface UseGovernanceDataParams {
  defaultTab?: GovernanceTabId;
}

const ALL_TABS: GovernanceTabId[] = ["integrity", "security", "audit", "system", "health"];
const LIMITED_GOVERNANCE_TABS: GovernanceTabId[] = ["integrity", "audit", "health"];

const isAllowedGovernanceTab = (
  value: string | null,
  allowedTabs: GovernanceTabId[],
): value is GovernanceTabId => {
  return value !== null && allowedTabs.includes(value as GovernanceTabId);
};

export const useGovernanceData = ({ defaultTab = "integrity" }: UseGovernanceDataParams = {}) => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const allowedTabs = useMemo<GovernanceTabId[]>(() => {
    if (currentUser?.role === ROLES.ADMIN) {
      return ALL_TABS;
    }
    if (currentUser?.role === ROLES.SUPERVISOR_ELEVATED || currentUser?.role === ROLES.AUDITOR) {
      return LIMITED_GOVERNANCE_TABS;
    }
    return LIMITED_GOVERNANCE_TABS;
  }, [currentUser?.role]);

  const fallbackTab: GovernanceTabId = allowedTabs.includes(defaultTab) ? defaultTab : "integrity";

  const [activeTab, setActiveTab] = useState<GovernanceTabId>(
    isAllowedGovernanceTab(tabParam, allowedTabs) ? tabParam : fallbackTab,
  );

  useEffect(() => {
    if (isAllowedGovernanceTab(tabParam, allowedTabs)) {
      setActiveTab(tabParam);
      return;
    }

    setActiveTab(fallbackTab);
    if (tabParam !== null) {
      setSearchParams({ tab: fallbackTab }, { replace: true });
    }
  }, [tabParam, allowedTabs, fallbackTab, setSearchParams]);

  const handleTabChange = (tabId: GovernanceTabId) => {
    if (!allowedTabs.includes(tabId)) return;
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return {
    activeTab,
    allowedTabs,
    handleTabChange,
  };
};
