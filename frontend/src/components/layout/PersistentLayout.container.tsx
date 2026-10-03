import React from "react";
import { Outlet } from "react-router";
import PersistentLayoutView from "./PersistentLayout.view";
import { usePersistentLayoutController } from "../../hooks/layout/usePersistentLayoutController";

const PersistentLayoutContainer: React.FC = () => {
  const controller = usePersistentLayoutController();

  if (!controller.currentUser) return null;

  return (
    <PersistentLayoutView
      currentPath={controller.currentPath}
      isSidebarOpen={controller.isSidebarOpen}
      isInitialSync={controller.isInitialSync}
      canShowDevPanel={controller.canShowDevPanel}
      showHomeFab={controller.showHomeFab}
      homeFabTitle={controller.homeFabTitle}
      isHandoverModalOpen={controller.isHandoverModalOpen}
      handoverData={controller.handoverData}
      onToggleSidebar={controller.toggleSidebar}
      onOpenSidebarFromSwipe={controller.openSidebarFromSwipe}
      onGoHome={controller.goHome}
      onCloseHandoverModal={controller.closeHandoverModal}
    >
      <Outlet />
    </PersistentLayoutView>
  );
};

export default PersistentLayoutContainer;
