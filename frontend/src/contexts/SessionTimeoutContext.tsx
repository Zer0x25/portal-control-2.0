import React, { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const SessionTimeoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, logout, currentUser } = useAuth();
  const timeoutIdRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    // Only set a timer if the user is a 'Usuario'
    if (currentUser?.role !== "Usuario") {
      return;
    }

    timeoutIdRef.current = window.setTimeout(() => {
      // Before logging out, double-check if the user is still authenticated and has the correct role
      // This prevents logout calls after the user has manually logged out.
      if (isAuthenticated && currentUser?.role === "Usuario") {
        logout();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout, isAuthenticated, currentUser]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    const handleActivity = () => {
      resetTimer();
    };

    if (isAuthenticated) {
      // Set up listeners and initial timer
      events.forEach((event) => window.addEventListener(event, handleActivity));
      resetTimer();
    }

    // Cleanup function
    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [isAuthenticated, resetTimer]);

  return <>{children}</>;
};
