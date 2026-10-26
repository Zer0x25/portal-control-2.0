export type ClockingActionType =
  "jornada_inicio" | "colacion_inicio" | "colacion_fin" | "jornada_fin";

type ClockingActionButtonStyles = {
  enabled: string;
  disabled: string;
};

const CLOCKING_ACTION_BUTTON_STYLES: Record<ClockingActionType, ClockingActionButtonStyles> = {
  jornada_inicio: {
    enabled: "bg-green-600 text-white border border-green-500 shadow-md hover:bg-green-700",
    disabled:
      "bg-green-500/10 text-green-800/60 dark:text-green-200/70 border border-green-500/20 shadow-none",
  },
  colacion_inicio: {
    enabled: "bg-amber-600 text-white border border-amber-500 shadow-md hover:bg-amber-700",
    disabled:
      "bg-amber-500/10 text-amber-800/60 dark:text-amber-200/70 border border-amber-500/20 shadow-none",
  },
  colacion_fin: {
    enabled: "bg-sky-600 text-white border border-sky-500 shadow-md hover:bg-sky-700",
    disabled:
      "bg-sky-500/10 text-sky-800/60 dark:text-sky-200/70 border border-sky-500/20 shadow-none",
  },
  jornada_fin: {
    enabled: "bg-rose-600 text-white border border-rose-500 shadow-md hover:bg-rose-700",
    disabled:
      "bg-rose-500/10 text-rose-800/60 dark:text-rose-200/70 border border-rose-500/20 shadow-none",
  },
};

export const getClockingActionButtonClassName = (
  action: ClockingActionType,
  disabled: boolean,
): string =>
  disabled
    ? CLOCKING_ACTION_BUTTON_STYLES[action].disabled
    : CLOCKING_ACTION_BUTTON_STYLES[action].enabled;
