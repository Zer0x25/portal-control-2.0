import React from "react";
import { useSecurityInsightsController } from "../hooks/useSecurityInsightsController";
import { SecurityInsightsView } from "../views/SecurityInsights.view";

const SecurityInsightsContainer: React.FC = () => {
  const logic = useSecurityInsightsController();
  return <SecurityInsightsView {...logic} />;
};

export default SecurityInsightsContainer;
