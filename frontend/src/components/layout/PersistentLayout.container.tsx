import React, { Fragment, Suspense } from "react";
import { Outlet } from "react-router";
import PersistentLayoutView from "./PersistentLayout.view";
import { usePersistentLayoutController } from "../../hooks/layout/usePersistentLayoutController";
import { ROUTES } from "../../constants";

const AutoStartShiftAutomation = React.lazy(() => import("./AutoStartShiftAutomation"));

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
      onSwipeTouchStart={controller.handleSwipeTouchStart}
      onSwipeTouchEnd={controller.handleSwipeTouchEnd}
      onGoHome={controller.goHome}
      onCloseHandoverModal={controller.closeHandoverModal}
    >
      <Fragment>
        <Outlet />
        {controller.isAutoStartEligible && (
          <Suspense fallback={null}>
            <AutoStartShiftAutomation
              useClockingOptions={controller.currentPath === ROUTES.TIME_CONTROL}
            />
          </Suspense>
        )}
      </Fragment>
    </PersistentLayoutView>
  );
};

export default PersistentLayoutContainer;
