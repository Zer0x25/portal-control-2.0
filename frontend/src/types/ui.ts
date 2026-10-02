export type SyncState = "idle" | "syncing" | "success" | "error" | "no-network";

export type ClockingStatus =
  | "fuera"
  | "en_jornada"
  | "en_colacion"
  | "terminada"
  | "en_jornada_post_colacion"
  | "jornada_terminada_anomalia"
  | "por_iniciar"
  | "no_programado"
  | "ausente";

export interface ModalState {
  type:
    | "editRecord"
    | "deleteRecord"
    | "addNovelty"
    | "missedClockIn"
    | "missedClockOut"
    | "responsibleClockOut"
    | "viewHistory"
    | "none";
  /** Payload attached to a modal request. Today every caller passes the record
   * the modal acts on (e.g. the time record to view or delete). */
  data?: import("./time").DailyTimeRecord;
}

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}
