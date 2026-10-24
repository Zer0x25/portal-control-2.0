import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ROUTES } from "../../constants";
import { useAuth } from "../useAuth";
import { useClockingEmployeeOptionsQuery, useEmployeesQuery } from "../queries/useEmployeesQuery";
import { useSystemStatus } from "../useSystemStatus";
import { useStore } from "../../store/useStore";

export const useHeaderController = () => {
  const { currentUser, logout } = useAuth();
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
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const openChangePassword = () => {
    setIsChangePasswordModalOpen(true);
    setIsDropdownOpen(false);
  };

  const openManual = () => {
    setIsManualModalOpen(true);
    setIsDropdownOpen(false);
  };

  const welcomeName = (() => {
    if (currentUser?.employeeId) {
      const employee = employees.find((e) => e.id === currentUser.employeeId);
      if (employee) return employee.name;
    }
    return currentUser?.username;
  })();

  return {
    currentUser,
    dropdownRef,
    handleLogout,
    isChangePasswordModalOpen,
    isDropdownOpen,
    isManualModalOpen,
    openChangePassword,
    openManual,
    setIsChangePasswordModalOpen,
    setIsDropdownOpen,
    setIsManualModalOpen,
    soundEnabled,
    systemStatus,
    toggleSound,
    welcomeName,
  };
};
