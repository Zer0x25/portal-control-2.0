import React from "react";
import { useCommunicationsData } from "../hooks/useCommunicationsData";
import { CommunicationsView } from "../views/Communications.view";

export const CommunicationsContainer: React.FC = () => {
  const logic = useCommunicationsData();
  return <CommunicationsView {...logic} />;
};
