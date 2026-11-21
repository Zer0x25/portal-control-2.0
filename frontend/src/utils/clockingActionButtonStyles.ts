export type ClockingActionType =
  "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin";

type ClockingActionButtonStyles = {
  enabled: string;
  disabled: string;
};

const CLOCKING_ACTION_BUTTON_STYLES: Record<ClockingActionType, ClockingActionButtonStyles> = {
  jornada_inicio: {
    enabled:
      "bg-token-status-success text-token-text-onAccent border border-token-status-success shadow-md hover:opacity-90",
    disabled:
      "bg-token-status-success/10 text-token-status-success-text/60 border border-token-status-success/20 shadow-none",
  },
  colacion_inicio: {
    enabled:
      "bg-token-status-warning text-token-text-onAccent border border-token-status-warning shadow-md hover:opacity-90",
    disabled:
      "bg-token-status-warning/10 text-token-status-warning-text/60 border border-token-status-warning/20 shadow-none",
  },
  colacion_fin: {
    enabled:
      "bg-token-status-info text-token-text-onAccent border border-token-status-info shadow-md hover:opacity-90",
    disabled:
      "bg-token-status-info/10 text-token-status-info-text/60 border border-token-status-info/20 shadow-none",
  },
  jornada_fin: {
    enabled:
      "bg-token-status-error text-token-text-onAccent border border-token-status-error shadow-md hover:opacity-90",
    disabled:
      "bg-token-status-error/10 text-token-status-error-text/60 border border-token-status-error/20 shadow-none",
  },
};

export const getClockingActionButtonClassName = (
  action: ClockingActionType,
  disabled: boolean,
): string =>
  disabled
    ? CLOCKING_ACTION_BUTTON_STYLES[action].disabled
    : CLOCKING_ACTION_BUTTON_STYLES[action].enabled;
