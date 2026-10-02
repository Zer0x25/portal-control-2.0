import { useStore } from "../store/useStore";

export const useAuth = () => {
  const currentUser = useStore((state) => state.currentUser);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isAuthLoading = useStore((state) => state.isAuthLoading);
  const mfaRequired = useStore((state) => state.mfaRequired);
  const mfaToken = useStore((state) => state.mfaToken);
  const login = useStore((state) => state.login);
  const logout = useStore((state) => state.logout);
  const validateMFACode = useStore((state) => state.validateMFACode);
  const isForcePasswordChangeModalOpen = useStore((state) => state.isForcePasswordChangeModalOpen);
  const closeForcePasswordChangeModal = useStore((state) => state.closeForcePasswordChangeModal);

  return {
    currentUser,
    isAuthenticated,
    isAuthLoading,
    mfaRequired,
    mfaToken,
    login,
    logout,
    validateMFACode,
    isForcePasswordChangeModalOpen: isForcePasswordChangeModalOpen as boolean,
    closeForcePasswordChangeModal,
  };
};
