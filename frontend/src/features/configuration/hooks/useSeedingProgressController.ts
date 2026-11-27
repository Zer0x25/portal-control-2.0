import React from "react";
import type { SeedPhase2Job } from "../../../services/seedingService";
import { getDBInstance } from "../../../utils/indexedDB";
import { purgePersistedQueryCache } from "../../../lib/queryCache";
import { logger } from "../../../utils/logger";
import { useSeedingProgressHealth } from "./useSeedingProgressHealth";

/** Opciones que el controller acepta del container. */
export interface UseSeedingProgressControllerOptions {
  isOpen: boolean;
  isFinished: boolean;
  error: string | null;
  job: SeedPhase2Job | null | undefined;
  jobLogs: string[];
  progressSteps: string[];
}

/**
 * Estado y acciones del modal de progreso del seeding (spec 036 T10b,
 * extension al modal de progreso).
 *
 * Extraido del monolito original (`SeedingProgressModal.tsx`, hoy dividido en
 * container/view): el controller es el
 * unico punto donde vive el estado (cronometro, derived de fase 1/2,
 * autoscroll del log) y la unica accion con efectos fuera del render
 * (`handleReload`, que limpia el almacenamiento local y recarga).
 */
export const useSeedingProgressController = ({
  isOpen,
  isFinished,
  error,
  job,
  jobLogs,
  progressSteps,
}: UseSeedingProgressControllerOptions) => {
  const [seconds, setSeconds] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = React.useRef<HTMLDivElement | null>(null);

  /**
   * Fase 2 "activa": el job existe y no esta detenido. Un job `pending`
   * significa que la fase 2 ya fue iniciada por el operador y esta en cola
   * (el worker la transicionara a `running`); solo `stopped` indica que la
   * fase 2 no corrio (job pre-creado al finalizar la fase 1).
   */
  const isPhase2Active = !!job && job.status !== "stopped";

  /** Final efectivo: terminal de fase 2 cuando hay job; bandera de fase 1 si no. */
  const effectiveIsFinished = isPhase2Active
    ? job?.status === "completed" || job?.status === "failed"
    : isFinished;

  /** Error efectivo: resumen del job (fase 2) o error de fase 1. */
  const effectiveError = isPhase2Active ? (job?.errorSummary ?? null) : error;

  /** Fase 1 terminada y fase 2 esperando que el operador la inicie. */
  const isPhase1DonePhase2Pending = isFinished && !isPhase2Active;

  /** Metricas de salud (DB/API/heap/RSS) refrescadas mientras el modal corre. */
  const healthData = useSeedingProgressHealth(isOpen, effectiveIsFinished);

  /** Lineas de log a mostrar: fase 2 usa los logs del job; fase 1 sus steps. */
  const displayedLogs = isPhase2Active && jobLogs.length > 0 ? jobLogs : progressSteps;

  /** Cronometro: se reinicia al abrir y corre hasta el final efectivo. */
  React.useEffect(() => {
    if (isOpen) {
      setSeconds(0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && !effectiveIsFinished) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, effectiveIsFinished]);

  /** Autoscroll del log al final cuando llegan lineas nuevas. */
  React.useEffect(() => {
    if (!isOpen || displayedLogs.length === 0) return;
    logEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [isOpen, displayedLogs.length]);

  /** Formatea segundos como `m:ss`. */
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /** `m:ss` transcurridos desde la apertura del modal. */
  const elapsedLabel = formatTime(seconds);

  /** Porcentaje de la fase 2 (dia actual / total de dias). */
  const currentPercent = job?.progress
    ? Math.round((job.progress.currentDay / job.progress.totalDays) * 100)
    : 0;

  /** Limpia IndexedDB/sessionStorage y recarga la app para rehidratar datos. */
  const handleReload = async () => {
    try {
      const db = await getDBInstance();
      await Promise.all(Array.from(db.objectStoreNames).map((storeName) => db.clear(storeName)));
    } catch (e) {
      logger.warn("Error clearing IndexedDB:", e);
    }
    // El cache persistido de TanStack Query (IndexedDB propio) guarda la
    // data pre-seed: sin purgarlo, la recarga vuelve a servir datos viejos.
    try {
      await purgePersistedQueryCache();
    } catch (e) {
      logger.warn("Error purgando el cache persistido de queries:", e);
    }
    localStorage.removeItem("lastSyncTime");
    sessionStorage.clear();
    window.location.href = "/";
  };

  return {
    logEndRef,
    isPhase2Active,
    effectiveIsFinished,
    effectiveError,
    isPhase1DonePhase2Pending,
    healthData,
    displayedLogs,
    elapsedLabel,
    currentPercent,
    handleReload,
  };
};

export type SeedingProgressController = ReturnType<typeof useSeedingProgressController>;
