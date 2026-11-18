import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "../../constants";
import { useAuth } from "../useAuth";
import { useClockingEmployeeOptionsQuery, useEmployeesQuery } from "../queries/useEmployeesQuery";
import { useSystemStatus } from "../useSystemStatus";
import { useStore } from "../../store/useStore";
import { queryKeys } from "../../lib/queryKeys";

export const useHeaderController = () => {
  const queryClient = useQueryClient();
  const { currentUser, logout, markMfaEnabled } = useAuth();
  const location = useLocation();
  const useClockingOptions = location.pathname === ROUTES.TIME_CONTROL;
  const employeesQuery = useEmployeesQuery(!useClockingOptions);
  const clockingOptionsQuery = useClockingEmployeeOptionsQuery(useClockingOptions);
  const employees = useClockingOptions
    ? (clockingOptionsQuery.data ?? [])
    : (employeesQuery.data ?? []);
  const { status: systemStatus } = useSystemStatus();
  const soundEnabled = useStore((state) => state.soundEnabled);
  const setSoundEnabled = useStore((state) => state.setSoundEnabled);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isMfaSetupModalOpen, setIsMfaSetupModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const openChangePassword = () => {
    setIsChangePasswordModalOpen(true);
    setIsDropdownOpen(false);
  };

  const openMfaSetup = () => {
    setIsMfaSetupModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleMfaSetupSuccess = () => {
    markMfaEnabled();
    void queryClient.invalidateQueries({ queryKey: queryKeys.users() });
    setIsMfaSetupModalOpen(false);
  };

  const openManual = () => {
    setIsManualModalOpen(true);
    setIsDropdownOpen(false);
  };

  const canConfigureMfa = currentUser?.role === "Administrador" && !currentUser.mfaEnabled;

  const welcomeName = (() => {
    if (currentUser?.employeeId) {
      const employee = employees.find((e) => e.id === currentUser.employeeId);
      if (employee) return employee.name;
    }
    return currentUser?.username;
  })();

  return {
    canConfigureMfa,
    currentUser,
    dropdownRef,
    handleLogout,
    handleMfaSetupSuccess,
    isChangePasswordModalOpen,
    isDropdownOpen,
    isManualModalOpen,
    isMfaSetupModalOpen,
    openChangePassword,
    openManual,
    openMfaSetup,
    setIsChangePasswordModalOpen,
    setIsDropdownOpen,
    setIsManualModalOpen,
    setIsMfaSetupModalOpen,
    soundEnabled,
    systemStatus,
    toggleSound,
    welcomeName,
  };
};
