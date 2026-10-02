import React from "react";
import KioskView from "../views/Kiosk.view";
import { useKioskData } from "../hooks/useKioskData";

const KioskContainer: React.FC = () => {
  const logic = useKioskData();
  return <KioskView {...logic} />;
};

export default KioskContainer;
