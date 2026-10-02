import React, { useEffect, useState } from "react";
import { useStore } from "../../store/useStore";
import TopLoadingBarView from "./TopLoadingBar.view";

const TopLoadingBarContainer: React.FC = () => {
  const isGlobalLoading = useStore((state) => state.isGlobalLoading);
  const loadingProgress = useStore((state) => state.loadingProgress);
  const isInitialSync = useStore((state) => state.isInitialSync);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isGlobalLoading) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isGlobalLoading]);

  return (
    <TopLoadingBarView
      loadingProgress={loadingProgress}
      isGlobalLoading={isGlobalLoading}
      visible={visible}
      isInitialSync={isInitialSync}
    />
  );
};

export default TopLoadingBarContainer;
