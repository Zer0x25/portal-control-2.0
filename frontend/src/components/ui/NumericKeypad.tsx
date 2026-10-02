import React from "react";
import { BackspaceIcon } from "./icons/index";

interface NumericKeypadProps {
  onInput: (value: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  className?: string;
  showConfirm?: boolean;
}

const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onInput,
  onDelete,
  onConfirm,
  className = "",
  showConfirm = true,
}) => {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "K", "0"];

  const handlePress = (
    e: React.PointerEvent | React.MouseEvent,
    callback: () => void,
    vibrationMs = 40,
  ) => {
    if (e.cancelable) e.preventDefault();
    callback();
    if (navigator.vibrate) {
      navigator.vibrate(vibrationMs);
    }
  };

  return (
    <div className={`grid grid-cols-3 gap-3 px-6 sm:px-12 ${className} touch-none select-none`}>
      {keys.map((key) => (
        <button
          key={key}
          onPointerDown={(e) => handlePress(e, () => onInput(key))}
          className="aspect-square flex items-center justify-center text-3xl font-black rounded-3xl bg-white/5 dark:bg-white/10 hover:bg-white/15 dark:hover:bg-white/20 border border-white/10 dark:border-white/20 backdrop-blur-md transition-all active:scale-90 active:bg-sap-blue/30 active:shadow-inner text-gray-800 dark:text-white font-mono shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          {key}
        </button>
      ))}
      <button
        onPointerDown={(e) => handlePress(e, onDelete, 60)}
        className="aspect-square flex items-center justify-center text-2xl rounded-3xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 backdrop-blur-md transition-all active:scale-90 active:bg-red-500/30 text-red-500 shadow-md hover:shadow-lg hover:-translate-y-0.5"
        aria-label="Borrar"
      >
        <BackspaceIcon className="w-4 h-4" />
      </button>

      {showConfirm && (
        <button
          onPointerDown={(e) => handlePress(e, onConfirm, 100)}
          className="col-span-3 h-16 mt-2 flex items-center justify-center text-sm font-black uppercase tracking-[0.3em] rounded-3xl bg-sap-blue text-white shadow-2xl shadow-blue-500/40 hover:brightness-110 hover:-translate-y-1 transition-all active:scale-[0.96] active:brightness-90"
        >
          Confirmar Identidad
        </button>
      )}
    </div>
  );
};

export default NumericKeypad;
