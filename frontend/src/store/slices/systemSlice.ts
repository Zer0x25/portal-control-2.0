import { StateCreator } from "zustand";
import { AppState } from "../types";

export interface SystemSlice {
  /**
   * Offset reloj-servidor en ms (spec 032).
   *
   * No es una coleccion remota: es un valor de proceso que los helpers
   * sincronos (`getBusinessNow`, timePolicy) leen desde el store. El hook
   * `useBusinessNow` usa el mismo offset para derivar la hora de negocio.
   */
  serverTimeOffset: number;
  setServerTimeOffset: (offset: number) => void;
}

export const createSystemSlice: StateCreator<AppState, [], [], SystemSlice> = (set) => ({
  serverTimeOffset: 0,

  setServerTimeOffset: (offset) => set({ serverTimeOffset: offset }),
});
