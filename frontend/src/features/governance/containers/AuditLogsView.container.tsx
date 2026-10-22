import React from "react";
import AuditLogsViewView from "../views/AuditLogsView.view";
import { useAuditLogsController } from "../hooks/useAuditLogsController";

const AuditLogsViewContainer: React.FC = () => {
  const controller = useAuditLogsController();
  return <AuditLogsViewView {...controller} />;
};

export default AuditLogsViewContainer;
