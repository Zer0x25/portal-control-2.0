import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../constants";
import { UserRole } from "../types/index";
import { getDefaultRouteForRole } from "../utils/routeUtils";
import { logger } from "../utils/logger";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const { isAuthenticated, currentUser, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} />;
  }

  // Updated logic to check against an array of roles
  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    (!currentUser || !requiredRoles.includes(currentUser.role))
  ) {
    // Only log in development mode to reduce console noise
    if (import.meta.env.MODE === "development") {
      logger.info(
        `Access denied. User role ${currentUser?.role} is not in the required roles list [${requiredRoles.join(", ")}]. Redirecting...`,
      );
    }
    // Smart redirect based on role to prevent loops
    if (currentUser) {
      const defaultRoute = getDefaultRouteForRole(currentUser.role);
      return <Navigate to={defaultRoute} />;
    }
    // Si currentUser es null, redirige al login por seguridad
    return <Navigate to={ROUTES.LOGIN} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
