import React from "react";
import { useHolidayManagerController } from "../hooks/useHolidayManagerController";
import { HolidayManagerView } from "../views/HolidayManager.view";

const HolidayManagerContainer: React.FC = () => {
  const logic = useHolidayManagerController();
  return <HolidayManagerView {...logic} />;
};

export default HolidayManagerContainer;
