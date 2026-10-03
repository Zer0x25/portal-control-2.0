import React, { Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "./router/ProtectedRoute";
import { ROUTES } from "./constants";
import { useAuth } from "./hooks/useAuth";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import { useNavigationLoading } from "./hooks/useNavigationLoading";
import { ROLES } from "./utils/mappings";
import { useSocketEvents } from "./hooks/useSocketEvents";
import { useControlInternoEnabledQuery } from "./hooks/queries/useConfigQuery";

// Lazy loading components
const LoginPage = React.lazy(() => import("./features/auth/pages/LoginPage"));
const PersistentLayout = React.lazy(() => import("./components/layout/PersistentLayout"));
const ToastContainer = React.lazy(() => import("./components/layout/ToastContainer"));
const TopLoadingBar = React.lazy(() => import("./components/layout/TopLoadingBar"));
const SessionExpiredOverlay = React.lazy(() => import("./components/ui/SessionExpiredOverlay"));
const InitialSyncOverlay = React.lazy(() => import("./components/ui/InitialSyncOverlay"));
const BackgroundActivitySpinner = React.lazy(
  () => import("./components/ui/BackgroundActivitySpinner"),
);
const ForceChangePasswordModal = React.lazy(() =>
  import("./features/auth").then((module) => ({
    default: module.ForceChangePasswordModal,
  })),
);
const DashboardPage = React.lazy(
  () => import("./features/dashboard/containers/Dashboard.container"),
);
const SupervisorDashboardPage = React.lazy(
  () => import("./features/supervisor-dashboard/containers/SupervisorDashboardPage.container"),
);
const TimeControlPage = React.lazy(
  () => import("./features/time-control/containers/TimeControl.container"),
);
const LogbookPage = React.lazy(() =>
  import("./features/logbook/containers/Logbook.container").then((m) => ({
    default: m.LogbookContainer,
  })),
);
const ConfigurationPage = React.lazy(() =>
  import("./features/configuration/containers/Configuration.container").then((m) => ({
    default: m.ConfigurationContainer,
  })),
);
const WorkerPortalPage = React.lazy(
  () => import("./features/worker-portal/containers/WorkerPortal.container"),
);
const KioskPage = React.lazy(() => import("./features/kiosk/pages/KioskPage"));

const TheoreticalShiftsPage = React.lazy(() =>
  import("./features/theoretical-shifts/containers/TheoreticalShifts.container").then((m) => ({
    default: m.TheoreticalShiftsContainer,
  })),
);
const ShiftCalendarPage = React.lazy(() =>
  import("./features/shift-calendar/containers/ShiftCalendar.container").then((m) => ({
    default: m.ShiftCalendarContainer,
  })),
);
const CommunicationsPage = React.lazy(() =>
  import("./features/communications/containers/Communications.container").then((m) => ({
    default: m.CommunicationsContainer,
  })),
);

const MeterReadingsPage = React.lazy(() =>
  import("./features/meters/containers/MeterReadings.container").then((m) => ({
    default: m.MeterReadingsContainer,
  })),
);
const EmployeeManagementPage = React.lazy(() =>
  import("./features/employee-management/containers/EmployeeManagement.container").then((m) => ({
    default: m.EmployeeManagementContainer,
  })),
);
const UserManagementPage = React.lazy(() =>
  import("./features/user-management/containers/UserManagement.container").then((m) => ({
    default: m.UserManagementContainer,
  })),
);
const PersonnelManagementPage = React.lazy(() =>
  import("./features/personnel-management/containers/PersonnelManagement.container").then((m) => ({
    default: m.PersonnelManagementContainer,
  })),
);
const MonthlyPlanningPage = React.lazy(() =>
  import("./features/planning/containers/MonthlyPlanning.container").then((m) => ({
    default: m.MonthlyPlanningContainer,
  })),
);
const GovernanceHubPage = React.lazy(() =>
  import("./features/governance/containers/GovernanceHub.container").then((m) => ({
    default: m.GovernanceHubContainer,
  })),
);

const App: React.FC = () => {
  const { isForcePasswordChangeModalOpen, closeForcePasswordChangeModal } = useAuth();
  const { logout } = useAuth();
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const { data: isControlInternoEnabled = true } = useControlInternoEnabledQuery();

  useNavigationLoading();
  useSocketEvents();

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Session lost (401/403). Initiating secure logout sequence...");
      setIsSessionExpired(true);

      // Wait for animation (3s) before actual logout
      setTimeout(() => {
        logout();
        setIsSessionExpired(false);
      }, 3000);
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, [logout]);

  const protectedLayoutElement = (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <PersistentLayout />
    </Suspense>
  );

  return (
    <>
      <Suspense fallback={null}>
        <InitialSyncOverlay />
      </Suspense>
      {isSessionExpired && (
        <Suspense fallback={null}>
          <SessionExpiredOverlay />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <TopLoadingBar />
      </Suspense>
      <Suspense fallback={null}>
        <BackgroundActivitySpinner />
      </Suspense>
      <Suspense fallback={null}>
        <ToastContainer />
      </Suspense>
      <Routes>
        <Route
          path={ROUTES.LOGIN}
          element={
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTES.KIOSK}
          element={
            <Suspense fallback={<LoadingSpinner fullScreen />}>
              <KioskPage />
            </Suspense>
          }
        />

        <Route element={protectedLayoutElement}>
          {isControlInternoEnabled && (
            <Route
              path={ROUTES.DASHBOARD}
              element={
                <ProtectedRoute
                  requiredRoles={[ROLES.CLOCK_CONTROL, ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]}
                >
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          )}

          <Route
            path={ROUTES.SUPERVISOR_DASHBOARD}
            element={
              <ProtectedRoute
                requiredRoles={[
                  ROLES.SUPERVISOR,
                  ROLES.ADMIN,
                  ROLES.SUPERVISOR_ELEVATED,
                  ROLES.AUDITOR,
                ]}
              >
                <SupervisorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.TIME_CONTROL}
            element={
              <ProtectedRoute
                requiredRoles={[
                  ROLES.CLOCK_CONTROL,
                  ROLES.ADMIN,
                  ROLES.SUPERVISOR_ELEVATED,
                  ROLES.SUPERVISOR,
                  ROLES.AUDITOR,
                ]}
              >
                <TimeControlPage />
              </ProtectedRoute>
            }
          />

          {isControlInternoEnabled && (
            <>
              <Route
                path={ROUTES.LOGBOOK}
                element={
                  <ProtectedRoute
                    requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED, ROLES.CLOCK_CONTROL]}
                  >
                    <LogbookPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.METER_READINGS}
                element={
                  <ProtectedRoute
                    requiredRoles={[ROLES.CLOCK_CONTROL, ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]}
                  >
                    <MeterReadingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.COMMUNICATIONS}
                element={
                  <ProtectedRoute
                    requiredRoles={[
                      ROLES.CLOCK_CONTROL,
                      ROLES.ADMIN,
                      ROLES.SUPERVISOR_ELEVATED,
                      ROLES.SUPERVISOR,
                      ROLES.AUDITOR,
                    ]}
                  >
                    <CommunicationsPage />
                  </ProtectedRoute>
                }
              />
            </>
          )}

          <Route
            path={ROUTES.CONFIGURATION}
            element={
              <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]}>
                <ConfigurationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.USER_MANAGEMENT}
            element={
              <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.EMPLOYEE_MANAGEMENT}
            element={
              <ProtectedRoute
                requiredRoles={[
                  ROLES.ADMIN,
                  ROLES.SUPERVISOR,
                  ROLES.SUPERVISOR_ELEVATED,
                  ROLES.CLOCK_CONTROL,
                ]}
              >
                <EmployeeManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.PERSONNEL_MANAGEMENT}
            element={
              <ProtectedRoute requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED]}>
                <PersonnelManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.THEORETICAL_SHIFTS}
            element={
              <ProtectedRoute
                requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SUPERVISOR_ELEVATED]}
              >
                <TheoreticalShiftsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.MONTHLY_PLANNING}
            element={
              <ProtectedRoute
                requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.SUPERVISOR_ELEVATED]}
              >
                <MonthlyPlanningPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SHIFT_CALENDAR}
            element={
              <ProtectedRoute
                requiredRoles={[
                  ROLES.USER,
                  ROLES.CLOCK_CONTROL,
                  ROLES.SUPERVISOR,
                  ROLES.ADMIN,
                  ROLES.SUPERVISOR_ELEVATED,
                ]}
              >
                <ShiftCalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.EMAIL_CENTER}
            element={<Navigate to={`${ROUTES.CONFIGURATION}?tab=email`} replace />}
          />
          <Route
            path={ROUTES.WORKER_PORTAL}
            element={
              <ProtectedRoute requiredRoles={[ROLES.USER]}>
                <WorkerPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.GOVERNANCE_HUB}
            element={
              <ProtectedRoute
                requiredRoles={[ROLES.ADMIN, ROLES.SUPERVISOR_ELEVATED, ROLES.AUDITOR]}
              >
                <GovernanceHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.MASTER_DATA_EXPORT}
            element={<Navigate to={`${ROUTES.CONFIGURATION}?tab=master-data`} replace />}
          />
          <Route
            path={ROUTES.AUDIT_LOGS}
            element={<Navigate to={`${ROUTES.GOVERNANCE_HUB}?tab=audit`} replace />}
          />
          <Route
            path={ROUTES.ADMIN_TOOLS}
            element={<Navigate to={`${ROUTES.GOVERNANCE_HUB}?tab=system`} replace />}
          />
          <Route
            path={ROUTES.INTEGRITY_DASHBOARD}
            element={<Navigate to={`${ROUTES.GOVERNANCE_HUB}?tab=integrity`} replace />}
          />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} />} />
      </Routes>
      <Suspense fallback={null}>
        <ForceChangePasswordModal
          isOpen={isForcePasswordChangeModalOpen}
          onClose={closeForcePasswordChangeModal}
        />
      </Suspense>
    </>
  );
};

export default App;
