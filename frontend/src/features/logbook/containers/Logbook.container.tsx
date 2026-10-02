import React from "react";
import { useLogbookData } from "../hooks/useLogbookData";
import { LogbookView } from "../views/Logbook.view";

export const LogbookContainer: React.FC = () => {
  const logic = useLogbookData();
  return <LogbookView {...logic} />;
};
