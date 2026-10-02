import React, { useEffect, useState, useCallback } from "react";
import { useQuickNotes } from "../../hooks/useQuickNotes";
import { motion, AnimatePresence } from "framer-motion";
import { BellIcon, CheckIcon, SparklesIcon } from "../../components/ui/icons/index";
import { useAudio } from "../../hooks/useAudio";
import { QuickNote } from "../../types/index";

const INTERVALS = [10, 15, 20, 25, 30]; // in minutes
const STORAGE_KEY = "portal_reminder_next_trigger";

/**
 * Sistema de Recordatorios Ambientales
 *
 * Funcionalidad transversal que muestra recordatorios no intrusivos
 * de notas rápidas del usuario en intervalos aleatorios.
 *
 * Ubicación: src/notifications/components/AmbientReminderManager.tsx
 * Estado: ✅ IMPLEMENTADO
 */

const AmbientReminderManager: React.FC = () => {
  const { notes } = useQuickNotes();
  const { play } = useAudio();
  const [activeNote, setActiveNote] = useState<QuickNote | null>(null);
  const [nextTrigger, setNextTrigger] = useState<number | null>(null);

  const getNextInterval = useCallback(() => {
    const randomMin = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    return randomMin * 60 * 1000;
  }, []);

  const scheduleNext = useCallback(() => {
    const delay = getNextInterval();
    const triggerAt = Date.now() + delay;
    setNextTrigger(triggerAt);
    localStorage.setItem(STORAGE_KEY, triggerAt.toString());
  }, [getNextInterval]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const ts = parseInt(stored);
      if (ts > Date.now()) {
        setNextTrigger(ts);
      } else {
        scheduleNext();
      }
    } else {
      scheduleNext();
    }
  }, [scheduleNext]);

  useEffect(() => {
    if (!nextTrigger) return;

    const checkTimer = () => {
      if (Date.now() >= nextTrigger && !activeNote) {
        const candidates = notes.filter((n) => !n.isArchived && n.reminderEnabled);
        if (candidates.length > 0) {
          const picked = candidates[Math.floor(Math.random() * candidates.length)];
          setActiveNote(picked);
          play("pop");
        } else {
          scheduleNext();
        }
      }
    };

    const interval = setInterval(checkTimer, 10000);
    return () => clearInterval(interval);
  }, [nextTrigger, notes, activeNote, scheduleNext, play]);

  const handleAcknowledge = () => {
    setActiveNote(null);
    scheduleNext();
  };

  const NOTE_COLORS: Record<string, string> = {
    amber:
      "bg-[#fffbeb] dark:bg-amber-900 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100",
    blue: "bg-[#eff6ff] dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100",
    emerald:
      "bg-[#ecfdf5] dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100",
    rose: "bg-[#fff1f2] dark:bg-rose-900 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100",
    indigo:
      "bg-[#eef2ff] dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100",
  };

  const currentColor = activeNote?.color || "amber";

  return (
    <AnimatePresence>
      {activeNote && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pointer-events-none p-6 pt-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -100, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -100, rotate: 5 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className={`pointer-events-auto max-w-sm w-full p-6 shadow-[0_15px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.4)] border-b-4 ${NOTE_COLORS[currentColor]} rounded-[2rem] overflow-hidden relative`}
          >
            {/* Sticky Note Pin/Visual */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/10 dark:bg-white/10 rounded-full" />

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-2 mb-1">
                <BellIcon className="w-4 h-4 opacity-40" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                  Recordatorio
                </h4>
              </div>

              <div className="relative py-2">
                <p className="text-[15px] font-bold leading-relaxed px-2">{activeNote.content}</p>
              </div>

              <div className="flex items-center w-full mt-2">
                <button
                  onClick={handleAcknowledge}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-black/80 dark:bg-white/90 text-white dark:text-black hover:opacity-90 transition-all text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  Reconocer
                </button>
              </div>
            </div>

            {/* Micro Sparkle for "Aesthetics" */}
            <div className="absolute top-2 right-6 opacity-20">
              <SparklesIcon className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AmbientReminderManager;
