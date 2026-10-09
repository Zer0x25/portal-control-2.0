import React, { Suspense, useRef } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
const DeveloperPanel = React.lazy(() =>
  import("../ui/DeveloperPanel").then((m) => ({ default: m.DeveloperPanel })),
);
const ShiftHandoverModal = React.lazy(() => import("../ui/ShiftHandoverModal"));
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
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
      if (deltaX > 40) {
        onOpenSidebarFromSwipe(deltaX, 1);
      }
      touchStartXRef.current = null;
    }
  };

  return (
    <>
      <a
        href="#main-content"
        data-testid="skip-to-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:px-4 focus:py-2 focus:bg-token-accent-brand focus:text-token-text-onAccent focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-token-border-focus transition-all"
      >
        Saltar al contenido principal
      </a>

      <div
        data-testid="app-shell"
        data-current-path={currentPath}
        className="flex min-h-dvh h-dvh bg-token-surface-app overflow-hidden"
      >
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={onToggleSidebar} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isSidebarOpen && (
            <div
              data-testid="sidebar-swipe-area"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="fixed top-0 left-0 w-4 h-full z-40 lg:hidden cursor-pointer touch-none"
              title="Desliza para abrir el menú"
              role="presentation"
            />
          )}

          <Header toggleSidebar={onToggleSidebar} />

          <main
            id="main-content"
            role="main"
            tabIndex={-1}
            data-testid="main-content"
            className="flex-1 overflow-x-hidden overflow-y-auto bg-token-surface-app p-4 sm:p-6 lg:p-8 lg:pl-28 pb-safe transition-[padding,background-color] duration-300"
          >
            <Suspense
              fallback={
                isInitialSync ? null : <LoadingSpinner fullScreen label="Sincronizando Módulo..." />
              }
            >
              <div
                key={currentPath}
                className="min-h-full flex flex-col w-full max-w-[1440px] mx-auto animate-in fade-in duration-150"
              >
                {children}
              </div>
            </Suspense>
          </main>

          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
            {canShowDevPanel && (
              <div className="pointer-events-auto">
                <Suspense fallback={null}>
                  <DeveloperPanel />
                </Suspense>
              </div>
            )}

            {showHomeFab && (
              <button
                data-testid="home-fab-desktop"
                onClick={onGoHome}
                className="hidden md:flex bg-token-accent-brand hover:opacity-90 text-token-text-onAccent p-4 rounded-full shadow-md transition-transform hover:scale-110 pointer-events-auto"
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
                data-testid="home-fab-mobile"
                onClick={onGoHome}
                className="bg-token-accent-brand text-token-text-onAccent p-4 rounded-full shadow-lg transition-transform active:scale-95"
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
        <Suspense fallback={null}>
          <ShiftHandoverModal
            isOpen={isHandoverModalOpen}
            onClose={onCloseHandoverModal}
            data={handoverData}
          />
        </Suspense>
      )}
    </>
  );
};

export default PersistentLayoutView;
