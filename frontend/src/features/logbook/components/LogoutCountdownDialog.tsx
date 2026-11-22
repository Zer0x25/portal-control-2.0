import React from "react";
import CinematicModal from "../../../components/ui/CinematicModal";
import { Z } from "../../../constants/zScale";

const ignoreClose = () => {};

export default function LogoutCountdownDialog({ countdown }: { countdown: number }) {
  return (
    <CinematicModal
      isOpen={true}
      onClose={ignoreClose}
      closeOnBackdrop={false}
      closeOnEscape={false}
      showHeader={false}
      role="alertdialog"
      ariaLabelledBy="logout-countdown-title"
      ariaDescribedBy="logout-countdown-description"
      zClass={Z.modal}
      maxWidth="max-w-sm"
      overlayClassName="bg-token-text-primary/40 backdrop-blur-[2px] p-4"
      panelClassName="rounded-sm"
      bodyClassName="p-10 text-center"
    >
      <h2
        id="logout-countdown-title"
        className="text-lg font-bold uppercase tracking-tight text-token-text-primary"
      >
        Operación Finalizada
      </h2>
      <p
        id="logout-countdown-description"
        className="my-4 text-[11px] font-semibold uppercase tracking-wider text-token-text-tertiary"
      >
        Cierre de sesión automático en...
      </p>
      <div className="text-6xl font-black font-mono tracking-tighter text-(--sidebar-text-active) tabular-nums">
        {countdown}
      </div>
    </CinematicModal>
  );
}
