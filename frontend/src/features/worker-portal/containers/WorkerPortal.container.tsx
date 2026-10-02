import React from "react";
import WorkerPortalView from "../views/WorkerPortal.view";
import type { WorkerPortalViewProps } from "../views/WorkerPortal.view";
import { useWorkerPortalData } from "../hooks/useWorkerPortalData";

const WorkerPortalContainer: React.FC = () => {
  const viewProps: WorkerPortalViewProps = useWorkerPortalData();
  return <WorkerPortalView {...viewProps} />;
};

export default WorkerPortalContainer;
