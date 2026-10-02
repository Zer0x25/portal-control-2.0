import React from "react";
import NotificationCenterView from "./NotificationCenter.view";
import { useNotificationCenterController } from "../../hooks/layout/useNotificationCenterController";

const NotificationCenterContainer: React.FC = () => {
  const controller = useNotificationCenterController();

  return (
    <NotificationCenterView
      isOpen={controller.isOpen}
      unreadCount={controller.unreadCount}
      notifications={controller.notifications}
      dropdownRef={controller.dropdownRef}
      onToggleOpen={controller.toggleOpen}
      onNotificationClick={controller.handleNotificationClick}
    />
  );
};

export default NotificationCenterContainer;
