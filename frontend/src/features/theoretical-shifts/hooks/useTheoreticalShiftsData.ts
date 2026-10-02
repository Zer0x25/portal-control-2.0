import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

type ActiveTab = "patterns" | "assignments" | "leaves" | "holidays";

export const useTheoreticalShiftsData = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as ActiveTab | null;

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tabParam && ["patterns", "assignments", "leaves", "holidays"].includes(tabParam)
      ? tabParam
      : "patterns",
  );

  useEffect(() => {
    if (tabParam && ["patterns", "assignments", "leaves", "holidays"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (id: string) => {
    const tabId = id as ActiveTab;
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return {
    activeTab,
    handleTabChange,
  };
};
