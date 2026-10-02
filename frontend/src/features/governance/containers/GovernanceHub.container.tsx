import React from "react";
import { GovernanceTabId, useGovernanceData } from "../hooks/useGovernanceData";
import { GovernanceHubView } from "../views/GovernanceHub.view";

interface GovernanceHubContainerProps {
  defaultTab?: GovernanceTabId;
}

export const GovernanceHubContainer: React.FC<GovernanceHubContainerProps> = ({ defaultTab }) => {
  const logic = useGovernanceData({ defaultTab });
  return <GovernanceHubView {...logic} />;
};
