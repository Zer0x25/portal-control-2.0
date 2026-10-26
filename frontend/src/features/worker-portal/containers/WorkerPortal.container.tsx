import React from "react";
import WorkerPortalView from "../views/WorkerPortal.view";
import type { WorkerPortalViewProps } from "../views/WorkerPortal.view";
import { useWorkerPortalData } from "../hooks/useWorkerPortalData";
import { RenderProfiler } from "../../../utils/RenderProfiler";

const WorkerPortalContainer: React.FC = () => {
  const viewProps: WorkerPortalViewProps = useWorkerPortalData();
  return (
    <RenderProfiler id="worker-portal:view">
      <WorkerPortalView {...viewProps} />
    </RenderProfiler>
  );
};

export default WorkerPortalContainer;
