import React from "react";
import SidebarView from "./Sidebar.view";
import { useSidebarController } from "../../hooks/layout/useSidebarController";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const SidebarContainer: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const controller = useSidebarController({ isOpen, toggleSidebar });

  return (
    <SidebarView
      isOpen={controller.isOpen}
      isExpanded={controller.isExpanded}
      menuItems={controller.menuItems}
      effectiveTheme={controller.effectiveTheme}
      showAboutModal={controller.showAboutModal}
      onToggleSidebar={controller.toggleSidebar}
      onMouseEnter={controller.handleMouseEnter}
      onMouseLeave={controller.handleMouseLeave}
      onItemClick={controller.handleItemClick}
      onToggleTheme={controller.handleToggleTheme}
      onOpenAbout={controller.openAboutModal}
      onCloseAbout={controller.closeAboutModal}
    />
  );
};

export default React.memo(SidebarContainer);
