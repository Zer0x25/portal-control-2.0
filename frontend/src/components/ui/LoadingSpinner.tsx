import React from "react";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  label?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  label,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className={`rounded-full border-token-border-subtle ${sizeClasses[size]}`} />
        <div
          className={`absolute inset-0 rounded-full border-t-sap-blue animate-spin ${sizeClasses[size]}`}
          style={{
            borderRightColor: "transparent",
            borderLeftColor: "transparent",
            borderBottomColor: "transparent",
          }}
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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-token-surface-stripe">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-[radial-gradient(circle_at_center,rgba(0,87,146,0.05)_0%,transparent_70%)] z-0" />
        </div>
        <div className="relative z-10 transition-all duration-700 ease-in-out">{spinner}</div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
