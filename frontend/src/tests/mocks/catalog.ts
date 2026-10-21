/**
 * Catalogo de payloads por endpoint (spec 035, T5).
 *
 * El test de invalidacion necesita que el **mismo** endpoint devuelva datos
 * distintos antes y despues de la mutacion: asi se verifica que la query se
 * vuelve a pedir (re-fetch) y que el dato cacheado es el nuevo.
 *
 * El catalogo se indexa por el **pathname real** de la peticion (no por el
 * patron del handler): `/api/configs/global_max_hours` y
 * `/api/configs/area_list` son entradas distintas.
 */
const payloads = new Map<string, unknown>();

/** Fija el payload que devuelve un endpoint del catalogo. */
export const setCatalogPayload = (pathname: string, payload: unknown): void => {
  payloads.set(pathname, payload);
};

/** Payload actual de un endpoint del catalogo (`undefined` si no hay). */
export const getCatalogPayload = (pathname: string): unknown => payloads.get(pathname);

/** Restablece el catalogo (lo llama el `afterEach` global de `setup.ts`). */
export const resetCatalog = (): void => {
  payloads.clear();
};
