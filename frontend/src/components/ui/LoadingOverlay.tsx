import React from "react";

interface LoadingOverlayProps {
  message?: string;
  /** If true, uses fixed positioning covering the entire screen. Default: false (relative to parent) */
  fullScreen?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, fullScreen = true }) => {
  const content = (
    <div className="z-100 flex flex-col items-center justify-center p-12 bg-token-surface-card border border-token-border-technical rounded-sm shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95">
      {/* Subtle tech background for the card */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,87,146,0.03)_0%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-10 h-10 mb-8">
          <div className="absolute inset-0 border-2 border-token-border-subtle rounded-full opacity-20"></div>
          <div className="absolute inset-0 border-2 border-transparent border-t-sap-blue rounded-full animate-spin [animation-duration:1s]" />
          <div className="absolute inset-2 rounded-full bg-sap-blue/5 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-sap-blue/20 animate-pulse" />
          </div>
        </div>

        <p className="text-token-text-primary font-black text-sm uppercase tracking-widest leading-tight animate-in fade-in slide-in-from-bottom-1">
          {message}
        </p>
        <p className="mt-2 text-[10px] text-token-text-secondary font-bold uppercase tracking-tighter">
          Un momento por favor
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-99999 flex items-center justify-center bg-token-surface-stripe/60 backdrop-blur-sm p-4 animate-in fade-in">
        {content}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-token-surface-stripe/40 backdrop-blur-[2px] animate-in fade-in">
      {content}
    </div>
  );
};

export default LoadingOverlay;
