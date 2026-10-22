import React, { useId } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  id?: string;
  /**
   * Nombre accesible del interruptor.
   *
   * El `Switch` es un `div` con `role="switch"`: no es un control de
   * formulario nativo, así que `<label htmlFor>` no lo etiqueta. El nombre
   * accesible llega por `aria-label` (spec 036 T4 / AC3).
   */
  label?: string;
  /** Mensaje de error: activa `aria-invalid` y `aria-describedby`. */
  error?: string;
  "aria-label"?: string;
}

/**
 * Spec 036 T4 (AC3): el interruptor completa el contrato de a11y de error.
 *
 * Antes no tenía `label` ni `error`, así que un `Switch` con validación no
 * podía expresar `aria-invalid` ni asociar su mensaje de error. Ahora comparte
 * el mismo contrato que `Input`, `Select` y `Textarea`, incluido el fallback
 * de `useId()` para el `id`.
 */
const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled,
  className = "",
  size = "md",
  id,
  label,
  error,
  "aria-label": ariaLabel,
}) => {
  const generatedId = useId();
  const switchId = id || generatedId;
  const errorId = `${switchId}-error`;
  const accessibleName = ariaLabel ?? label;

  const toggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const sizeClasses = {
    sm: {
      wrapper: "w-8 h-4",
      knob: "w-3 h-3",
      translate: "translate-x-4",
    },
    md: {
      wrapper: "w-11 h-6",
      knob: "w-5 h-5",
      translate: "translate-x-5",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <>
      <div
        id={switchId}
        role="switch"
        aria-checked={checked}
        aria-label={accessibleName}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={toggle}
        className={`
        relative inline-flex items-center rounded-full transition-colors duration-300 ease-in-out cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-token-border-focus focus:ring-offset-2 dark:focus:ring-offset-token-surface-app
        ${checked ? "bg-token-accent-brand border-transparent" : "bg-token-surface-technical border border-token-border-subtle"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${currentSize.wrapper}
        ${className}
      `}
      >
        <span
          className={`
          pointer-events-none inline-block rounded-full bg-white shadow ring-0 transition duration-300 ease-in-out transform
          ${checked ? currentSize.translate : "translate-x-0.5"}
          ${currentSize.knob}
        `}
        />
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1.5 ml-1 text-[10px] font-black uppercase tracking-widest text-token-status-error animate-pulse"
        >
          {error}
        </p>
      )}
    </>
  );
};

export default Switch;
