import React from "react";

interface TopLoadingBarViewProps {
  loadingProgress: number;
  isGlobalLoading: boolean;
  visible: boolean;
  isInitialSync: boolean;
}

const TopLoadingBarView: React.FC<TopLoadingBarViewProps> = ({
  loadingProgress,
  isGlobalLoading,
  visible,
  isInitialSync,
}) => {
  if (!visible || isInitialSync) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-100000 h-[2px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-linear-to-r from-transparent via-sap-blue to-indigo-400 shadow-[0_0_15px_rgba(0,143,211,0.8),0_0_5px_rgba(255,255,255,0.5)] transition-[width,opacity] duration-300 ease-out"
        style={{
          width: `${loadingProgress}%`,
          opacity: isGlobalLoading ? 1 : 0,
        }}
      />
    </div>
  );
};

export default TopLoadingBarView;
