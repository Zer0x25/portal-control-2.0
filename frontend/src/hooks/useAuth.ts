import { useStore } from "../store/useStore";
import { useShallow } from "zustand/react/shallow";

export const useAuth = () =>
  useStore(
    useShallow((state) => ({
      currentUser: state.currentUser,
      isAuthenticated: state.isAuthenticated,
      isAuthLoading: state.isAuthLoading,
      mfaRequired: state.mfaRequired,
      mfaToken: state.mfaToken,
      login: state.login,
      logout: state.logout,
      validateMFACode: state.validateMFACode,
      isForcePasswordChangeModalOpen: state.currentUser?.mustChangePassword === true,
      clearMustChangePassword: state.clearMustChangePassword,
    })),
  );
