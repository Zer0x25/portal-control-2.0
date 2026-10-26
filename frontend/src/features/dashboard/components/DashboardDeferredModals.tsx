import React, { Suspense, useState, type ReactNode } from "react";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";

const QuickNotesModal = React.lazy(() => import("./QuickNotesModal.container"));
const ShiftReportModal = React.lazy(() => import("../../logbook/components/ShiftReportModal"));

const DeferredModal = ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => {
  const [hasOpened, setHasOpened] = useState(isOpen);

  // Remember the first opening before committing children. Keeping the controller
  // mounted afterward preserves unsent drafts and selected colors on reopening.
  if (isOpen && !hasOpened) setHasOpened(true);
  if (!isOpen && !hasOpened) return null;

  return <Suspense fallback={<LoadingSpinner fullScreen />}>{children}</Suspense>;
};

export const DashboardQuickNotesModal = (props: React.ComponentProps<typeof QuickNotesModal>) => (
  <DeferredModal isOpen={props.isOpen}>
    <QuickNotesModal {...props} />
  </DeferredModal>
);

export const DashboardShiftReportModal = (props: React.ComponentProps<typeof ShiftReportModal>) => (
  <DeferredModal isOpen={props.isOpen}>
    <ShiftReportModal {...props} />
  </DeferredModal>
);
