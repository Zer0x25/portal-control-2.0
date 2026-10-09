import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  id?: string;
  "aria-label"?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled,
  className = "",
  size = "md",
  id,
  "aria-label": ariaLabel,
}) => {
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
    <div
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
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
  );
};

export default Switch;
