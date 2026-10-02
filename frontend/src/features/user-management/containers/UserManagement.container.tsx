import React from "react";
import { useUserManagementData } from "../hooks/useUserManagementData";
import { UserManagementView } from "../views/UserManagement.view";

interface UserManagementContainerProps {
  isEmbedded?: boolean;
}

export const UserManagementContainer: React.FC<UserManagementContainerProps> = ({ isEmbedded }) => {
  const logic = useUserManagementData({ isEmbedded });
  return <UserManagementView {...logic} />;
};
