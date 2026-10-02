import React from "react";
import { ConfigTabId, useConfigurationData } from "../hooks/useConfigurationData";
import { ConfigurationView } from "../views/Configuration.view";

interface ConfigurationContainerProps {
  defaultTab?: ConfigTabId;
}

export const ConfigurationContainer: React.FC<ConfigurationContainerProps> = ({ defaultTab }) => {
  const logic = useConfigurationData({ defaultTab });
  return <ConfigurationView {...logic} />;
};
