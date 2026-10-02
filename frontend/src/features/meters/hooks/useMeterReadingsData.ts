import { useState } from "react";
import { useMeterReadings } from "../../../hooks/useMeterReadings";

export const useMeterReadingsData = () => {
  const { isLoadingReadings } = useMeterReadings();
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return {
    isLoadingReadings,
    isConfigPanelOpen,
    isFormOpen,
    setIsConfigPanelOpen,
    setIsFormOpen,
  };
};
