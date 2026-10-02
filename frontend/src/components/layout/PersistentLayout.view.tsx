import React, { Suspense } from "react";
import { motion } from "framer-motion";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { DeveloperPanel } from "../ui/DeveloperPanel";
import ShiftHandoverModal from "../ui/ShiftHandoverModal";
import ScreenSizeIndicator from "../ui/ScreenSizeIndicator";
import { HomeIcon } from "../ui/icons/index";
import LoadingSpinner from "../ui/LoadingSpinner";
import type { ShiftHandoverData } from "../../types";

interface PersistentLayoutViewProps {
  children: React.ReactNode;
  currentPath: string;
  isSidebarOpen: boolean;
  isInitialSync: boolean;
  canShowDevPanel: boolean;
  showHomeFab: boolean;
  homeFabTitle: string;
  isHandoverModalOpen: boolean;
  handoverData: ShiftHandoverData | null;
  onToggleSidebar: () => void;
  onOpenSidebarFromSwipe: (offsetX: number, velocityX: number) => void;
  onGoHome: () => void;
  onCloseHandoverModal: () => void;
}

const PersistentLayoutView: React.FC<PersistentLayoutViewProps> = ({
  children,
  currentPath,
  isSidebarOpen,
  isInitialSync,
  canShowDevPanel,
  showHomeFab,
  homeFabTitle,
  isHandoverModalOpen,
  handoverData,
  onToggleSidebar,
  onOpenSidebarFromSwipe,
  onGoHome,
  onCloseHandoverModal,
}) => {
  return (
    <>
      <div className="flex h-screen bg-sap-bone dark:bg-sap-dark-gray">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={onToggleSidebar} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isSidebarOpen && (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.1 }}
              onDragEnd={(_, info) => {
                onOpenSidebarFromSwipe(info.offset.x, info.velocity.x);
              }}
              className="fixed top-0 left-0 w-4 h-full z-[40] lg:hidden cursor-pointer touch-none"
              title="Desliza para abrir el menú"
            />
          )}

          <Header toggleSidebar={onToggleSidebar} />

          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-token-surface-app p-6 md:p-8 lg:p-12 lg:pl-28 transition-[padding,background-color] duration-300">
            <Suspense
              fallback={
                isInitialSync ? null : <LoadingSpinner fullScreen label="Sincronizando Módulo..." />
              }
            >
              <motion.div
                key={currentPath}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="min-h-full flex flex-col"
              >
                {children}
              </motion.div>
            </Suspense>
          </main>

          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
            {canShowDevPanel && (
              <div className="pointer-events-auto">
                <DeveloperPanel />
              </div>
            )}

            {showHomeFab && (
              <button
                onClick={onGoHome}
                className="hidden md:flex bg-sap-blue hover:bg-sap-light-blue text-white p-4 rounded-full shadow-md dark:bg-sap-light-blue dark:hover:bg-blue-600 transition-transform hover:scale-110 pointer-events-auto"
                aria-label={homeFabTitle}
                title={homeFabTitle}
              >
                <HomeIcon className="w-8 h-8" />
              </button>
            )}
          </div>

          {showHomeFab && (
            <div className="fixed bottom-6 left-6 z-50 md:hidden">
              <button
                onClick={onGoHome}
                className="bg-sap-blue text-white p-4 rounded-full shadow-lg dark:bg-sap-light-blue transition-transform active:scale-95"
                aria-label={homeFabTitle}
              >
                <HomeIcon className="w-7 h-7" />
              </button>
            </div>
          )}

          <ScreenSizeIndicator />
        </div>
      </div>

      {isHandoverModalOpen && (
        <ShiftHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={onCloseHandoverModal}
          data={handoverData}
        />
      )}
    </>
  );
};

export default PersistentLayoutView;
