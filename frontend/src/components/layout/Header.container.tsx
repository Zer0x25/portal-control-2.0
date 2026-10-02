import React from "react";
import HeaderView from "./Header.view";
import { useHeaderController } from "../../hooks/layout/useHeaderController";

interface HeaderProps {
  toggleSidebar: () => void;
}

const HeaderContainer: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const controller = useHeaderController();

  return (
    <HeaderView
      toggleSidebar={toggleSidebar}
      currentUser={controller.currentUser ? { role: controller.currentUser.role } : null}
      welcomeName={controller.welcomeName}
      systemStatus={controller.systemStatus}
      soundEnabled={controller.soundEnabled}
      isDropdownOpen={controller.isDropdownOpen}
      isChangePasswordModalOpen={controller.isChangePasswordModalOpen}
      isManualModalOpen={controller.isManualModalOpen}
      dropdownRef={controller.dropdownRef}
      onToggleSound={controller.toggleSound}
      onToggleDropdown={() => controller.setIsDropdownOpen((prev) => !prev)}
      onOpenChangePassword={controller.openChangePassword}
      onOpenManual={controller.openManual}
      onCloseChangePassword={() => controller.setIsChangePasswordModalOpen(false)}
      onCloseManual={() => controller.setIsManualModalOpen(false)}
      onLogout={controller.handleLogout}
    />
  );
};

export default HeaderContainer;
