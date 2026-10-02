import React from "react";
import { useMasterDataExportController } from "../hooks/useMasterDataExportController";
import { MasterDataExportView } from "../views/MasterDataExport.view";

const MasterDataExportContainer: React.FC = () => {
  const logic = useMasterDataExportController();
  return <MasterDataExportView {...logic} />;
};

export default MasterDataExportContainer;
