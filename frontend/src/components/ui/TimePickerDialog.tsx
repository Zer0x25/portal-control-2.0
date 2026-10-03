import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="relative w-full max-w-[320px] bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-4xl pointer-events-auto overflow-hidden"
          >
            {/* Display Section */}
            <div className="p-8 pb-6 flex flex-col items-center border-b border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("hours")}
                  className={`text-5xl font-mono font-black transition-all ${view === "hours" ? colorClass + " scale-110 drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]" : "text-gray-400 opacity-50"}`}
                >
                  {selectedHour}
                </button>
                <span className="text-4xl font-mono font-black text-gray-300">:</span>
                <button
                  onClick={() => setView("minutes")}
                  className={`text-5xl font-mono font-black transition-all ${view === "minutes" ? colorClass + " scale-110 drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]" : "text-gray-400 opacity-50"}`}
                >
                  {selectedMinute}
                </button>
              </div>
              <div className="mt-4 flex gap-6">
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.3em] ${view === "hours" ? colorClass : "text-gray-400"}`}
                >
                  Horas
                </span>
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.3em] ${view === "minutes" ? colorClass : "text-gray-400"}`}
                >
                  Minutos
                </span>
              </div>
            </div>

            {/* Selection Grid */}
            <div className="p-6">
              <div className="grid grid-cols-4 gap-2">
                {(view === "hours" ? hours : minutes).map((val) => (
                  <motion.button
                    key={val}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (view === "hours") {
                        setSelectedHour(val);
                        setView("minutes");
                      } else {
                        setSelectedMinute(val);
                      }
                    }}
                    className={`
                      h-12 flex items-center justify-center rounded-xl font-mono font-bold text-sm transition-all
                      ${
                        (view === "hours" ? selectedHour : selectedMinute) === val
                          ? `${bgAccentClass} text-white shadow-lg`
                          : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                      }
                    `}
                  >
                    {val}
                  </motion.button>
                ))}
                {view === "minutes" && (
                  <div className="col-span-4 mt-2 px-1">
                    <input
                      type="range"
                      min="0"
                      max="59"
                      value={parseInt(selectedMinute)}
                      onChange={(e) => setSelectedMinute(e.target.value.padStart(2, "0"))}
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-white/10 overflow-hidden [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_8px_inset] [&::-webkit-slider-thumb]:shadow-current ${colorClass}`}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TimePickerDialog;
