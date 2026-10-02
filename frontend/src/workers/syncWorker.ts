import { WorkerRequest, WorkerResponse, WorkerResult } from "./types";

const DB_NAME = "SAPHRPortalDB";

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { type, payload, id } = e.data;

  if (type === "PUT_BULK") {
    const { storeName, items } = payload;

    try {
      const result = await putBulkInWorker(storeName, items);
      const response: WorkerResponse = { type: "SUCCESS", id, result };
      self.postMessage(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown worker error";
      const response: WorkerResponse = { type: "ERROR", id, error: errorMessage };
      self.postMessage(response);
    }
  }
};

async function putBulkInWorker(storeName: string, items: unknown[]): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);

    request.onerror = () => reject(new Error("Failed to open DB in worker"));

    request.onsuccess = (event: Event) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);

      let successCount = 0;
      let errorCount = 0;

      tx.oncomplete = () => {
        db.close();
        resolve({ successCount, errorCount, total: items.length });
      };

      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error("Transaction error in worker"));
      };

      for (const item of items) {
        try {
          const req = store.put(item);
          req.onsuccess = () => {
            successCount++;
          };
          req.onerror = () => {
            errorCount++;
          };
        } catch {
          errorCount++;
        }
      }
    };
  });
}
