import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useIsFetching, useIsRestoring } from "@tanstack/react-query";
import { useStore } from "../store/useStore";

/**
 * Barra de carga de navegacion acoplada al estado real de las queries
 * (spec 034, T18, AC6).
 *
 * Antes: un `setTimeout` **fijo de 400 ms** ("simulacion") que cerraba la
 * barra aunque las queries de la ruta nueva siguieran en vuelo, y que no
 * mostraba nada cuando la carga real tardaba mas.
 *
 * Ahora:
 * - La barra se acopla a `useIsFetching()` / `useIsRestoring()` de TanStack
 *   Query: permanece visible mientras haya queries en vuelo (o se reidraten
 *   desde la cache persistida) de la ruta.
 * - El **piso perceptual** (200 ms) solo se aplica cuando la carga real fue
 *   mas rapida que un destello; la duracion real de la query es el limite
 *   natural de la barra, asi que nunca se cierra antes de tiempo.
 * - Un **techo de seguridad** (8 s) impide que una query colgada deje la barra
 *   bloqueada para siempre.
 */

/** Piso perceptual: por debajo de esto la barra parpadearia. */
const MIN_LOADING_MS = 200;

/** Techo de seguridad ante una query que nunca resuelve. */
const MAX_LOADING_MS = 8000;

/**
 * Detecta cambios de navegacion y expone el estado de carga via la barra
 * global (`TopLoadingBar`).
 */
export const useNavigationLoading = () => {
  const location = useLocation();
  const isFetching = useIsFetching();
  const isRestoring = useIsRestoring();
  const startLoading = useStore((state) => state.startLoading);
  const stopLoading = useStore((state) => state.stopLoading);

  const routeKey = location.pathname;
  /** Instante en que arranco la carga de la ruta actual. */
  const startedAtRef = useRef<number | null>(null);

  // 1) Al cambiar de ruta se abre la barra y se arma el techo de seguridad.
  useEffect(() => {
    startedAtRef.current = Date.now();
    startLoading();

    const safetyTimer = setTimeout(() => {
      startedAtRef.current = null;
      stopLoading();
    }, MAX_LOADING_MS);

    return () => clearTimeout(safetyTimer);
  }, [routeKey, startLoading, stopLoading]);

  // 2) La barra se cierra cuando no queda ninguna query en vuelo, respetando
  //    el piso perceptual (la duracion real de la query manda).
  useEffect(() => {
    if (startedAtRef.current === null) return;
    if (isFetching > 0 || isRestoring) return;

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

    const timer = setTimeout(() => {
      startedAtRef.current = null;
      stopLoading();
    }, remaining);

    return () => clearTimeout(timer);
  }, [isFetching, isRestoring, routeKey, stopLoading]);
};
