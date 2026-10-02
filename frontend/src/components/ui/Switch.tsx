import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled,
  className = "",
  size = "md",
}) => {
  const toggle = () => {
    if (!disabled) {
      onChange(!checked);
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
      onClick={toggle}
      className={`
        relative inline-flex items-center rounded-full transition-colors duration-300 ease-in-out cursor-pointer
        ${checked ? "bg-sap-blue border-transparent" : "bg-token-surface-stripe border-transparent"}
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
