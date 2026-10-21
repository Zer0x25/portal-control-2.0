import { StateCreator } from "zustand";
import { AppState } from "../types";

export interface SystemSlice {
  /**
   * Offset reloj-servidor en ms (spec 032).
   *
   * No es una coleccion remota: es un valor de proceso que los helpers
   * sincronos (`getBusinessNow`, timePolicy) leen desde el store. La fuente
   * que lo calcula vive en `useServerTimeSync`, no aqui.
   */
  serverTimeOffset: number;
  setServerTimeOffset: (offset: number) => void;
}

export const createSystemSlice: StateCreator<AppState, [], [], SystemSlice> = (set) => ({
  serverTimeOffset: 0,

  setServerTimeOffset: (offset) => set({ serverTimeOffset: offset }),
});
