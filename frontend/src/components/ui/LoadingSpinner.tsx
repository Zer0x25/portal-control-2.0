import React from "react";

export type LoadingSpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type LoadingSpinnerVariant = "default" | "onAccent" | "subtle";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: LoadingSpinnerSize;
  /** `onAccent` para spinners blancos sobre superficies de acento. */
  variant?: LoadingSpinnerVariant;
  label?: string;
  fullScreen?: boolean;
}

const SIZE_CLASSES: Record<LoadingSpinnerSize, { box: string; ring: string }> = {
  xs: { box: "h-4 w-4", ring: "border-2" },
  sm: { box: "h-6 w-6", ring: "border-2" },
  md: { box: "h-8 w-8", ring: "border-2" },
  lg: { box: "h-12 w-12", ring: "border-2" },
  xl: { box: "h-16 w-16", ring: "border-4" },
};

const ARC_CLASSES: Record<LoadingSpinnerVariant, string> = {
  default: "border-t-token-accent-brand",
  onAccent: "border-t-white",
  subtle: "border-t-token-text-tertiary",
};

/**
 * Unica primitiva de spinner del design system (spec 031 T14 / AC9).
 *
 * Implementa el arco giratorio estandar (`animate-spin`) con variantes de
 * tamano; `LoadingOverlay`, `InitialSyncOverlay` y el spinner de fondo la
 * reutilizan en lugar de duplicar el markup. El unico `animate-spin` inline
 * permitido fuera de esta primitiva es el del estado `loading` de Button.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size,
  variant = "default",
  label,
  fullScreen = false,
  className = "",
  ...rest
}) => {
  const resolvedSize: LoadingSpinnerSize = size ?? (fullScreen ? "xl" : "md");
  const { box, ring } = SIZE_CLASSES[resolvedSize];

  const spinner = (
    <div
      {...rest}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Cargando"}
      className={`flex flex-col items-center gap-4 ${className}`.trim()}
    >
      <div className={`relative ${box}`}>
        <div
          className={`absolute inset-0 rounded-full border border-token-border-subtle ${box} ${ring}`}
        />
        <div
          className={`absolute inset-0 rounded-full ${ring} ${ARC_CLASSES[variant]} animate-spin ${box}`}
        />
      </div>
      {label && (
        <p className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-[0.3em] animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-token-surface-stripe">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-[radial-gradient(circle_at_center,rgba(0,87,146,0.05)_0%,transparent_70%)] z-0" />
        </div>
        <div className="relative z-10 transition-all duration-700 ease-in-out">{spinner}</div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
