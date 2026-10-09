import React, { useState } from "react";
import { CheckCircleIcon } from "./icons/index";
import Button from "./Button";

interface TimePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (time: string) => void;
  initialTime: string;
  accentColor?: "sap-blue" | "emerald";
}

const TimePickerDialog: React.FC<TimePickerDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTime,
  accentColor = "sap-blue",
}) => {
  const [hh, mm] = initialTime.split(":");
  const [selectedHour, setSelectedHour] = useState(hh || "12");
  const [selectedMinute, setSelectedMinute] = useState(mm || "00");
  const [view, setView] = useState<"hours" | "minutes">("hours");

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

  const handleSave = () => {
    onSave(`${selectedHour}:${selectedMinute}`);
    onClose();
  };

  const colorClass = accentColor === "sap-blue" ? "text-sap-blue" : "text-emerald-500";
  const bgAccentClass = accentColor === "sap-blue" ? "bg-sap-blue" : "bg-emerald-600";

  return (
    isOpen && (
      <div className="fixed inset-0 z-110 flex items-center justify-center p-4 pointer-events-none">
        <div
          onClick={onClose}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto animate-in fade-in"
        />

        <div className="relative w-full max-w-[320px] bg-token-surface-card border border-token-border-technical rounded-2xl shadow-2xl pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
          {/* Display Section */}
          <div className="p-8 pb-6 flex flex-col items-center border-b border-token-border-subtle bg-token-surface-stripe">
            <div className="flex items-center gap-3">
              <Button
                variant="none"
                onClick={() => setView("hours")}
                className={`text-5xl font-mono font-black transition shadow-none ${view === "hours" ? colorClass + " scale-110 drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]" : "text-token-text-tertiary opacity-50"}`}
              >
                {selectedHour}
              </Button>
              <span className="text-4xl font-mono font-black text-token-border-technical">:</span>
              <Button
                variant="none"
                onClick={() => setView("minutes")}
                className={`text-5xl font-mono font-black transition shadow-none ${view === "minutes" ? colorClass + " scale-110 drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]" : "text-token-text-tertiary opacity-50"}`}
              >
                {selectedMinute}
              </Button>
            </div>
            <div className="mt-4 flex gap-6">
              <span
                className={`text-[10px] font-black uppercase tracking-[0.3em] ${view === "hours" ? colorClass : "text-token-text-tertiary"}`}
              >
                Horas
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-[0.3em] ${view === "minutes" ? colorClass : "text-token-text-tertiary"}`}
              >
                Minutos
              </span>
            </div>
          </div>

          {/* Selection Grid */}
          <div className="p-6">
            <div className="grid grid-cols-4 gap-2">
              {(view === "hours" ? hours : minutes).map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    if (view === "hours") {
                      setSelectedHour(val);
                      setView("minutes");
                    } else {
                      setSelectedMinute(val);
                    }
                  }}
                  className={`
                      h-12 flex items-center justify-center rounded-xl font-mono font-bold text-sm transition hover:scale-105 active:scale-95
                      ${
                        (view === "hours" ? selectedHour : selectedMinute) === val
                          ? `${bgAccentClass} text-white shadow-lg`
                          : "bg-token-surface-technical text-token-text-secondary hover:bg-token-surface-hover"
                      }
                    `}
                >
                  {val}
                </button>
              ))}
              {view === "minutes" && (
                <div className="col-span-4 mt-2 px-1">
                  <input
                    type="range"
                    min="0"
                    max="59"
                    value={parseInt(selectedMinute)}
                    onChange={(e) => setSelectedMinute(e.target.value.padStart(2, "0"))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-token-surface-technical overflow-hidden [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_8px_inset] [&::-webkit-slider-thumb]:shadow-current ${colorClass}`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1 rounded-2xl h-12 font-bold"
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className={`${bgAccentClass} flex-1 rounded-2xl h-12 font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2`}
            >
              <CheckCircleIcon className="w-4 h-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    )
  );
};

export default TimePickerDialog;
