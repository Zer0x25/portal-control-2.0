import React from "react";
import DeveloperPanelView from "../views/DeveloperPanel.view";
import { useDeveloperPanelController } from "../hooks/useDeveloperPanelController";

const DeveloperPanelContainer: React.FC = () => {
  const controller = useDeveloperPanelController();
  return <DeveloperPanelView {...controller} />;
};

export default DeveloperPanelContainer;
