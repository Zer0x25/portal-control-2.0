import React from "react";
import GlobalVariablesManagerView from "../views/GlobalVariablesManager.view";
import { useGlobalVariablesController } from "../hooks/useGlobalVariablesController";

const GlobalVariablesManagerContainer: React.FC = () => {
  const controller = useGlobalVariablesController();
  return <GlobalVariablesManagerView {...controller} />;
};

export default GlobalVariablesManagerContainer;
