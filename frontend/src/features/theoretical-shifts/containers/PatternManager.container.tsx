import React from "react";
import { usePatternManagerController } from "../hooks/usePatternManagerController";
import { PatternManagerView } from "../views/PatternManager.view";

const PatternManagerContainer: React.FC = () => {
  const logic = usePatternManagerController();
  return <PatternManagerView {...logic} />;
};

export default PatternManagerContainer;
