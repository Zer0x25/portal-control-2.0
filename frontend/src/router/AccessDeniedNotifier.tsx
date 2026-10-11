import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useToasts } from "../hooks/useToasts";

/**
 * Muestra un aviso cuando ProtectedRoute redirige por rol insuficiente
 * (llega con `location.state.accessDenied`). Sin navegación extra:
 * se dispara una vez por `location.key`.
 */
const AccessDeniedNotifier: React.FC = () => {
  const location = useLocation();
  const { addToast } = useToasts();
  const seenKey = useRef<string | null>(null);
  const denied = (location.state as { accessDenied?: boolean } | null)?.accessDenied === true;

  useEffect(() => {
    if (denied && seenKey.current !== location.key) {
      seenKey.current = location.key;
      addToast("Acceso denegado: tu rol no tiene permiso para esa sección.", "warning");
    }
  }, [denied, location.key, addToast]);

  return null;
};

export default AccessDeniedNotifier;
