import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query } from "@tanstack/react-query";
import { openDB, type IDBPDatabase } from "idb";

import { BUILD_VERSION } from "./buildVersion";

/**
 * Persistencia del cache de TanStack Query (spec 032, AC2).
 *
 * - Base IndexedDB propia (`SAPHRPortalQueryCache`), separada de
 *   `SAPHRPortalDB` para no mezclarse con la cola de escritura offline.
 * - `shouldDehydrateQuery` usa una **allowlist** de raices de query: solo se
 *   persisten catalogos y datos de operacion. Cuentas (`users`), auditoria
 *   (`auditLogs`) y diagnostico (`integrityStatus`, `health`, `system`) quedan
 *   fuera por ser PII/seguridad.
 * - `buster` deriva de `__BUILD_VERSION__` (version de despliegue), de modo
 *   que un deploy nuevo invalida el cache anterior.
 */
export const QUERY_CACHE_DB = "SAPHRPortalQueryCache";
export const QUERY_CACHE_DB_VERSION = 1;
export const QUERY_CACHE_STORE = "queryCache";
export const QUERY_CACHE_KEY = "saphr:react-query-cache";

export const QUERY_CACHE_BUSTER = BUILD_VERSION;

/**
 * Raices de query que SI se persisten. Es una allowlist (nunca blocklist):
 * una query nueva queda fuera hasta que se declare aqui de forma explicita.
 */
export const PERSISTED_QUERY_ROOTS: readonly string[] = [
  "assignedShifts",
  "calendar",
  "calendarMatrix",
  "config",
  "correctionRequests",
  "dashboard",
  "employees",
  "holidays",
  "leaves",
  "meterReadings",
  "notes",
  "recordHistory",
  "reports",
  "shiftPatterns",
  "shiftReports",
  "timeRecords",
] as const;

/** Raices excluidas por PII o seguridad (documentadas para auditoria). */
export const SENSITIVE_QUERY_ROOTS: readonly string[] = [
  "auditLogs",
  "health",
  "integrityStatus",
  "system",
  "user",
  "users",
] as const;

const isPersistedRoot = (root: unknown): boolean =>
  typeof root === "string" && PERSISTED_QUERY_ROOTS.includes(root);

export const shouldDehydrateQuery = (query: Query): boolean => {
  if (query.state.status !== "success") return false;
  const [root] = query.queryKey;
  if (SENSITIVE_QUERY_ROOTS.includes(root as string)) return false;
  return isPersistedRoot(root);
};

let dbPromise: Promise<IDBPDatabase> | null = null;

const getCacheDb = (): Promise<IDBPDatabase> => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB no disponible"));
  }
  dbPromise ??= openDB(QUERY_CACHE_DB, QUERY_CACHE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(QUERY_CACHE_STORE)) {
        db.createObjectStore(QUERY_CACHE_STORE);
      }
    },
  });
  return dbPromise;
};

const indexedDbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const db = await getCacheDb();
    const value = await db.get(QUERY_CACHE_STORE, key);
    return typeof value === "string" ? value : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const db = await getCacheDb();
    await db.put(QUERY_CACHE_STORE, value, key);
  },
  removeItem: async (key: string): Promise<void> => {
    const db = await getCacheDb();
    await db.delete(QUERY_CACHE_STORE, key);
  },
};

export const queryCachePersister = createAsyncStoragePersister({
  storage: indexedDbStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
});

/**
 * Purga integral e idempotente del cache de queries. Se limita al store del
 * cache: nunca toca `SAPHRPortalDB` ni la cola offline de `syncSlice`.
 */
export const purgePersistedQueryCache = async (): Promise<void> => {
  const results = await Promise.allSettled([
    queryCachePersister.removeClient(),
    (async () => {
      const db = await getCacheDb();
      await db.clear(QUERY_CACHE_STORE);
    })(),
  ]);
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    // No relanzamos: el purge corre en logout y nunca debe bloquear la salida.
    console.warn("[QueryCache] Purge incompleto", failures);
  }
};

/** Solo para tests: olvida la conexion abierta. */
export const resetQueryCacheConnectionForTests = (): void => {
  dbPromise = null;
};
