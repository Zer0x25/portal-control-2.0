import React, { useRef, useState } from "react";
import { SearchIcon, XCircleIcon } from "./icons";

interface PremiumSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  shortcut?: string;
  disabled?: boolean;
}

const PremiumSearchInput: React.FC<PremiumSearchInputProps> = ({
  value,
  onChange,
  onFocus,
  placeholder = "Buscar...",
  className = "",
  shortcut = "⌘K",
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Background Glow Effect */}
      <div
        className={`absolute -inset-0.5 bg-linear-to-r from-sap-blue to-sap-light-blue rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500 ${isFocused ? "opacity-60 scale-[1.01]" : ""}`}
      ></div>

      <div className="relative flex items-center">
        {/* Search Icon Wrap */}
        <div className="absolute left-4 flex items-center justify-center">
          <div
            className={`transition-transform duration-300 ${isFocused ? "scale-110 rotate-5 text-sap-blue" : "scale-100 text-token-text-tertiary"}`}
          >
            <SearchIcon className="w-4 h-4" />
          </div>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (disabled) return;
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          data-testid="premium-search-input"
          className={`
            w-full h-11 pl-11 pr-12
            bg-token-surface-card border border-token-border-technical
            rounded-md outline-none
            text-[10px] font-black uppercase tracking-wider text-token-text-primary
            placeholder:text-token-text-tertiary
            transition duration-300
            ${disabled ? "opacity-50 cursor-not-allowed bg-token-surface-stripe" : isFocused ? "border-sap-blue shadow-lg shadow-sap-blue/10 bg-token-surface-card" : "hover:border-token-border-subtle"}
          `}
        />

        {/* Action Elements (Shortcut or Clear) */}
        <div className="absolute right-3 flex items-center gap-2">
          {value ? (
            <button
              key="clear"
              onClick={handleClear}
              className="p-1 hover:text-sap-error text-token-text-tertiary transition-colors animate-in fade-in zoom-in-90"
              title="Limpiar búsqueda"
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          ) : (
            <div
              key="shortcut"
              className="hidden sm:flex items-center justify-center px-1.5 py-0.5 rounded border border-token-border-subtle bg-token-surface-stripe text-[8px] font-black text-token-text-tertiary uppercase tracking-tighter animate-in fade-in"
            >
              {shortcut}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumSearchInput;
