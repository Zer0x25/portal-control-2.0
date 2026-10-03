import { IDBPDatabase, openDB, deleteDB } from "idb";
import { AppSetting, Employee } from "../types/index";
import { z } from "zod";
import {
  EmployeeSchema,
  UserSchema,
  AppSettingSchema,
  DailyTimeRecordSchema,
  ShiftReportSchema,
  AuditLogSchema,
  TheoreticalShiftPatternSchema,
  AssignedShiftSchema,
  QuickNoteSchema,
  MeterReadingItemSchema,
  LeaveRecordSchema,
  HolidaySchema,
  CorrectionRequestSchema,
  KpiCacheItemSchema,
  CalendarCacheItemSchema,
} from "../types/schemas";

export const DB_NAME = "SAPHRPortalDB";
export const DB_VERSION = 22; // Incremented to flush worker-corrupted data

// Define Object Store Names
export const STORES = {
  EMPLOYEES: "employees",
  DAILY_TIME_RECORDS: "dailyTimeRecords",
  SHIFT_REPORTS: "shiftReports",
  APP_SETTINGS: "appSettings",
  AUDIT_LOGS: "auditLogs",
  USERS: "users",
  THEORETICAL_SHIFT_PATTERNS: "theoreticalShiftPatterns",
  ASSIGNED_SHIFTS: "assignedShifts",
  QUICK_NOTES: "quickNotes",
  METER_READINGS: "meterReadings",
  LEAVES: "leaves",
  HOLIDAYS: "holidays",
  CORRECTION_REQUESTS: "correctionRequests",
  KPI_CACHE: "kpiCache",
  CALENDAR_CACHE: "calendarCache",
};

// Map stores to their Zod validation schemas
const schemaMap: Record<string, z.ZodSchema<unknown>> = {
  [STORES.EMPLOYEES]: EmployeeSchema,
  [STORES.USERS]: UserSchema,
  [STORES.APP_SETTINGS]: AppSettingSchema,
  [STORES.DAILY_TIME_RECORDS]: DailyTimeRecordSchema,
  [STORES.SHIFT_REPORTS]: ShiftReportSchema,
  [STORES.AUDIT_LOGS]: AuditLogSchema,
  [STORES.THEORETICAL_SHIFT_PATTERNS]: TheoreticalShiftPatternSchema,
  [STORES.ASSIGNED_SHIFTS]: AssignedShiftSchema,
  [STORES.QUICK_NOTES]: QuickNoteSchema,
  [STORES.METER_READINGS]: MeterReadingItemSchema,
  [STORES.LEAVES]: LeaveRecordSchema,
  [STORES.HOLIDAYS]: HolidaySchema,
  [STORES.CORRECTION_REQUESTS]: CorrectionRequestSchema,
  [STORES.KPI_CACHE]: KpiCacheItemSchema,
  [STORES.CALENDAR_CACHE]: CalendarCacheItemSchema,
};

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

const initDB = (): Promise<IDBPDatabase<unknown>> => {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // Helper function to robustly create a store and its indexes
      const createStoreWithSyncIndexes = (
        storeName: string,
        keyPath: string,
        indexes?: {
          name: string;
          keyPath: string;
          options?: IDBIndexParameters;
        }[],
      ) => {
        let store;
        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, { keyPath });
        } else {
          store = transaction.objectStore(storeName);
        }

        if (!store.indexNames.contains("syncStatus")) {
          store.createIndex("syncStatus", "syncStatus");
        }
        if (!store.indexNames.contains("isDeleted")) {
          store.createIndex("isDeleted", "isDeleted");
        }
        if (indexes) {
          indexes.forEach((idx) => {
            if (!store.indexNames.contains(idx.name)) {
              store.createIndex(idx.name, idx.keyPath, idx.options);
            }
          });
        }
      };

      // --- SCHEMA CREATION FIRST ---
      // This block must run before any migration scripts that might access these stores.
      createStoreWithSyncIndexes(STORES.EMPLOYEES, "id");
      createStoreWithSyncIndexes(STORES.DAILY_TIME_RECORDS, "id", [
        { name: "employeeId", keyPath: "employeeId" },
        { name: "entradaTimestamp", keyPath: "entradaTimestamp" },
        { name: "date", keyPath: "date" },
      ]);
      createStoreWithSyncIndexes(STORES.SHIFT_REPORTS, "id");
      createStoreWithSyncIndexes(STORES.USERS, "id", [
        { name: "username", keyPath: "username", options: { unique: true } },
      ]);
      createStoreWithSyncIndexes(STORES.THEORETICAL_SHIFT_PATTERNS, "id");
      createStoreWithSyncIndexes(STORES.ASSIGNED_SHIFTS, "id", [
        { name: "employeeId", keyPath: "employeeId" },
        { name: "shiftPatternId", keyPath: "shiftPatternId" },
      ]);
      createStoreWithSyncIndexes(STORES.LEAVES, "id", [
        { name: "employeeId", keyPath: "employeeId" },
        { name: "endDate", keyPath: "endDate" },
      ]);
      createStoreWithSyncIndexes(STORES.HOLIDAYS, "id", [
        { name: "date", keyPath: "date", options: { unique: false } },
      ]);
      createStoreWithSyncIndexes(STORES.CORRECTION_REQUESTS, "id", [
        { name: "employeeId", keyPath: "employeeId" },
        { name: "timeRecordId", keyPath: "timeRecordId" },
        { name: "status", keyPath: "status" },
      ]);
      createStoreWithSyncIndexes(STORES.APP_SETTINGS, "id");
      createStoreWithSyncIndexes(STORES.AUDIT_LOGS, "id", [
        { name: "timestamp", keyPath: "timestamp" },
      ]);
      createStoreWithSyncIndexes(STORES.QUICK_NOTES, "id", [
        { name: "createdAt", keyPath: "createdAt" },
      ]);
      createStoreWithSyncIndexes(STORES.METER_READINGS, "id", [
        { name: "timestamp", keyPath: "timestamp" },
      ]);
      if (!db.objectStoreNames.contains(STORES.KPI_CACHE)) {
        db.createObjectStore(STORES.KPI_CACHE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.CALENDAR_CACHE)) {
        db.createObjectStore(STORES.CALENDAR_CACHE, { keyPath: "id" });
      }

      // --- MIGRATION SCRIPTS ---
      // Only run migrations on an existing database, not a fresh install (oldVersion > 0)
      if (oldVersion > 0 && oldVersion < 15) {
        // Migration to add 'email' field to existing employees
        const employeeStore = transaction.objectStore(STORES.EMPLOYEES);
        employeeStore.openCursor().then(function cursorIterate(cursor) {
          if (!cursor) return;
          const employee = cursor.value as Employee;
          if (employee.email === undefined) {
            employee.email = "";
            cursor.update(employee);
          }
          cursor.continue().then(cursorIterate);
        });
      }
    },
  });
  return dbPromise;
};
// Ensure initDB is called once when the module loads to trigger upgrade if needed.
initDB();

// Generic CRUD operations
export const idbGetAll = async <T>(storeName: string): Promise<T[]> => {
  const db = await initDB();
  return db.getAll(storeName);
};

/**
 * Checks if a store is empty without loading all records.
 */
export const idbIsStoreEmpty = async (storeName: string): Promise<boolean> => {
  const db = await initDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const count = await store.count();
  return count === 0;
};

export const idbGetAllBy = async <T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey | IDBKeyRange,
): Promise<T[]> => {
  const db = await initDB();
  return db.getAllFromIndex(storeName, indexName, value);
};

export const idbGetRecordsByDateRange = async <T>(
  storeName: string,
  startDate: string,
  endDate: string,
): Promise<T[]> => {
  const db = await initDB();
  const range = IDBKeyRange.bound(startDate, endDate);
  return db.getAllFromIndex(storeName, "date", range);
};

export const idbGet = async <T>(storeName: string, key: string): Promise<T | undefined> => {
  const db = await initDB();
  return db.get(storeName, key);
};

export const idbPut = async <T>(storeName: string, item: T): Promise<IDBValidKey> => {
  // Ensure we have syncable fields if it's a syncable store
  const syncableStores = [
    STORES.EMPLOYEES,
    STORES.USERS,
    STORES.DAILY_TIME_RECORDS,
    STORES.THEORETICAL_SHIFT_PATTERNS,
    STORES.ASSIGNED_SHIFTS,
    STORES.LEAVES,
    STORES.HOLIDAYS,
  ];

  if (syncableStores.includes(storeName) && item && typeof item === "object") {
    const syncItem = item as {
      lastModified?: number;
      syncStatus?: string;
      isDeleted?: boolean;
    };
    if (syncItem.lastModified === undefined) syncItem.lastModified = Date.now();
    if (syncItem.syncStatus === undefined) syncItem.syncStatus = "synced";
    if (syncItem.isDeleted === undefined) syncItem.isDeleted = false;
  }

  const schema = schemaMap[storeName];
  if (schema) {
    try {
      schema.parse(item);
    } catch (e) {
      if (e instanceof z.ZodError) {
        console.error(`Validation failed for store '${storeName}':`, e.issues);
        throw new Error(`Invalid data structure for '${storeName}'.`, { cause: e });
      }
      throw e;
    }
  }

  const db = await initDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const result = await store.put(item);
  await tx.done;
  return result;
};

export const idbPutBulk = async <T>(
  storeName: string,
  items: T[],
  validate: boolean = true,
): Promise<void> => {
  if (items.length === 0) return;

  const syncableStores = [
    STORES.EMPLOYEES,
    STORES.USERS,
    STORES.DAILY_TIME_RECORDS,
    STORES.THEORETICAL_SHIFT_PATTERNS,
    STORES.ASSIGNED_SHIFTS,
    STORES.LEAVES,
    STORES.HOLIDAYS,
  ];

  if (syncableStores.includes(storeName)) {
    items.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const syncItem = item as {
        lastModified?: number;
        syncStatus?: string;
        isDeleted?: boolean;
      };
      if (syncItem.lastModified === undefined) syncItem.lastModified = Date.now();
      if (syncItem.syncStatus === undefined) syncItem.syncStatus = "synced";
      if (syncItem.isDeleted === undefined) syncItem.isDeleted = false;
    });
  }

  const schema = schemaMap[storeName];
  if (validate && schema) {
    // For very large datasets, validate individually and drop invalid rows to prevent sync abortion
    const validItems = [];
    let validationErrors = 0;

    for (let i = 0; i < items.length; i++) {
      try {
        schema.parse(items[i]);
        validItems.push(items[i]);
      } catch (e) {
        validationErrors++;
        if (validationErrors <= 5) {
          // Log only the first 5 errors to avoid spamming the console
          if (e instanceof z.ZodError) {
            console.warn(
              `[IDB Sync] Dropping invalid record in '${storeName}' at index ${i}:`,
              JSON.stringify(e.issues, null, 2),
            );
          } else {
            console.warn(`[IDB Sync] Dropping invalid record in '${storeName}' at index ${i}:`, e);
          }
        }
      }
    }

    if (validationErrors > 0) {
      console.warn(
        `[IDB Sync] Dropped ${validationErrors} invalid records in '${storeName}'. Syncing remaining ${validItems.length} valid items...`,
      );
    }

    // Replace items with only the valid ones
    items = validItems;
  }

  // Worker path disabled for now: schema/version drift between worker/main DB opens
  // has caused intermittent NotFound/transaction errors on some stores.
  // Keep deterministic writes in main thread chunked path until worker DB init is hardened.

  const db = await initDB();
  const CHUNK_SIZE = 500;
  let skippedCount = 0;
  let unmodifiedCount = 0;

  // Process in chunks to avoid blocking the main thread
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    // Create a new transaction for each chunk
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const seenKeys = new Set<string>();

    for (const item of chunk) {
      if (!item || typeof item !== "object") continue;
      const typedItem = item as Record<string, unknown>;
      const keyPath = store.keyPath as string;
      const id = typedItem[keyPath];

      // 1. Local Duplicate Check (within same chunk)
      if (typeof id === "string" && seenKeys.has(id)) {
        skippedCount++;
        continue;
      }
      if (typeof id === "string") seenKeys.add(id);

      try {
        // 2. "Smart Put" Check: Compare with existing item if possible
        if (typeof id === "string" && typedItem.lastModified !== undefined) {
          const existing = await store.get(id);
          if (
            existing &&
            typeof existing === "object" &&
            existing !== null &&
            "lastModified" in existing &&
            (existing as { lastModified?: unknown }).lastModified === typedItem.lastModified
          ) {
            unmodifiedCount++;
            continue; // Skip writing to disk if timestamps match
          }
        }

        store.put(item);
      } catch (err: unknown) {
        if (
          err instanceof DOMException &&
          (err.name === "ConstraintError" || err.message?.includes("uniqueness"))
        ) {
          skippedCount++;
        } else {
          throw err;
        }
      }
    }

    await tx.done;

    if (items.length > CHUNK_SIZE) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const actuallyPersisted = items.length - skippedCount - unmodifiedCount;
  if (items.length > 50) {
    console.warn(
      `[IDB] Store '${storeName}': ${actuallyPersisted} updated, ${unmodifiedCount} skipped (no changes), ${skippedCount} items invalid/duplicates.`,
    );
  }
};

export const idbDelete = async (storeName: string, key: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  await store.delete(key);
  await tx.done;
};

export const idbClear = async (storeName: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  await store.clear();
  await tx.done;
};

// Counter/Setting specific functions
export const COUNTER_IDS = {
  EMPLOYEE_ID: "employeeIdCounter",
  LOGBOOK_FOLIO: "logbookFolioCounter",
  GLOBAL_SETTING_MAX_WEEKLY_HOURS_ID: "globalMaxWeeklyHours",
  GLOBAL_AREA_LIST_ID: "globalAreaList",
  GLOBAL_METER_CONFIGS_ID: "globalMeterConfigs",
  GLOBAL_WORKDAY_TYPE_LIST_ID: "globalWorkdayTypeList",
  EMAIL_NOTIFICATION_RECIPIENTS_LIST_ID: "emailNotificationRecipientsList",
  COMMUNICATIONS_CONTENT_ID: "communicationsContent",
  EMAIL_NOTIFICATION_RULES_ID: "emailNotificationRules",
  LAST_SYNC_TIMESTAMP: "lastSyncTimestamp",
  LAST_QUICK_NOTES_VIEW_TIMESTAMP: "lastQuickNotesViewTimestamp",
  LAST_COMMUNICATIONS_VIEW_TIMESTAMP: "lastCommunicationsViewTimestamp",
  DASHBOARD_LAYOUT_CONFIG_PREFIX: "dashboardLayoutConfig_",
  ACCOUNTING_LOCK_DATE_ID: "accountingLockDate",
  SMTP_CONFIG_ID: "smtpConfig",
};

export const getSettingValue = async <T>(settingId: string, defaultValue: T): Promise<T> => {
  const setting = await idbGet<AppSetting>(STORES.APP_SETTINGS, settingId);
  return setting ? (setting.value as T) : defaultValue;
};

export const setSettingValue = async (settingId: string, value: unknown): Promise<IDBValidKey> => {
  return idbPut<AppSetting>(STORES.APP_SETTINGS, {
    id: settingId,
    value,
    lastModified: Date.now(),
    syncStatus: "pending",
    isDeleted: false,
  });
};

export const getCounterValue = async (counterId: string, defaultValue: number): Promise<number> => {
  return getSettingValue<number>(counterId, defaultValue);
};
export const setCounterValue = (counterId: string, value: unknown): Promise<IDBValidKey> => {
  return setSettingValue(counterId, value);
};

// Export store names and counter IDs for use in other files
export { initDB as getDBInstance }; // Export initDB for LogContext special clearAllLogs case

/**
 * Exports the entire IndexedDB database to a JSON file.
 */
export const exportDB = async (): Promise<void> => {
  try {
    const db = await initDB();
    const exportObject: Record<string, unknown[]> = {};

    for (const storeName of Object.values(STORES)) {
      if (db.objectStoreNames.contains(storeName)) {
        const allRecords = await db.getAll(storeName);
        exportObject[storeName] = allRecords;
      }
    }

    const jsonString = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `portal-control-interno-backup-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting database:", error);
    throw new Error("Failed to export database.", { cause: error });
  }
};

/**
 * Imports data from a JSON file into the IndexedDB, overwriting existing data.
 * @param file The JSON file to import.
 */
export const importDB = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonString = event.target?.result;
        if (typeof jsonString !== "string") {
          throw new Error("File could not be read as text.");
        }
        const dataToImport = JSON.parse(jsonString);

        // Basic validation to check if it looks like a valid export file
        const storeNames = Object.values(STORES);
        const importedKeys = Object.keys(dataToImport);
        if (!importedKeys.length || !importedKeys.some((key) => storeNames.includes(key))) {
          throw new Error("El archivo no parece ser una exportación válida de la base de datos.");
        }

        const db = await initDB();
        const tx = db.transaction(db.objectStoreNames, "readwrite");

        // Clear all stores first
        await Promise.all(
          Array.from(db.objectStoreNames).map((storeName) => {
            if (tx.objectStore(storeName)) {
              return tx.objectStore(storeName).clear();
            }
            return Promise.resolve();
          }),
        );

        console.warn("All stores cleared. Starting import...");

        // Populate all stores with imported data
        await Promise.all(
          Object.keys(dataToImport).map((storeName) => {
            if (db.objectStoreNames.contains(storeName)) {
              const store = tx.objectStore(storeName);
              const records = dataToImport[storeName];
              return Promise.all((records as unknown[]).map((record) => store.put(record)));
            }
            return Promise.resolve();
          }),
        );

        console.warn("Data import transaction prepared.");

        await tx.done;
        console.warn("Import transaction completed.");
        resolve();
      } catch (error) {
        console.error("Error during database import:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      reject(new Error("Failed to read file."));
    };
    reader.readAsText(file);
  });
};

/**
 * Retrieves a paginated and filtered list of records from an IndexedDB store.
 * Filtering is performed during cursor iteration to optimize memory usage.
 * @param storeName The name of the object store to query.
 * @param options The query options including paging, filtering, and date range.
 * @returns A promise that resolves to an object containing the page of data and the total number of filtered records.
 */
export const idbGetPagedAndFiltered = async <T>(
  storeName: string,
  options: {
    page: number;
    pageSize: number;
    filterFn: (item: T) => boolean;
    indexName: string;
    range: IDBKeyRange;
    direction: IDBCursorDirection;
  },
): Promise<{ data: T[]; total: number }> => {
  const db = await initDB();
  const { page, pageSize, filterFn, indexName, range, direction } = options;

  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);

  const filteredItems: T[] = [];
  let cursor = await index.openCursor(range, direction);

  while (cursor) {
    if (filterFn(cursor.value)) {
      filteredItems.push(cursor.value);
    }
    cursor = await cursor.continue();
  }

  const total = filteredItems.length;
  const startIndex = (page - 1) * pageSize;
  const data = filteredItems.slice(startIndex, startIndex + pageSize);

  return { data, total };
};

/**
 * Destructively clears all local data stores.
 * Used for emergency cache invalidation when server instance changes.
 */
export const wipeAllData = async (): Promise<void> => {
  try {
    // 1. Reset the cached promise to force a clean reconnect
    dbPromise = null;

    // 2. Use deleteDB for a guaranteed fresh start
    console.warn("🧨 Wiping IndexedDB data via deleteDB...");
    await deleteDB(DB_NAME, {
      blocked() {
        console.warn("[IDB] Delete blocked - Reload may be required.");
      },
    });

    console.warn("🧨 Todas las tiendas locales han sido eliminadas exitosamente.");
  } catch (error) {
    console.error("Error al vaciar IndexedDB:", error);
  }
};
