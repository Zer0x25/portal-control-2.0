import { useStore } from "../store/useStore";
import { WorkerRequest, WorkerResponse, WorkerResult } from "./types";
import SyncWorker from "./syncWorker.ts?worker";

interface PendingRequest {
  resolve: (value: WorkerResult) => void;
  reject: (reason: Error) => void;
}

class WorkerBridge {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestIdCounter = 0;

  constructor() {
    if (typeof window !== "undefined" && window.Worker) {
      // Lazy load worker
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new SyncWorker();

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { type, id, result, error } = e.data;
        const pending = this.pendingRequests.get(id);

        if (pending) {
          if (type === "SUCCESS" && result) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error || "Unknown worker error"));
          }
          this.pendingRequests.delete(id);
          // Update global activity spinner
          useStore.getState().decrementProcessing();
        }
      };

      this.worker.onerror = (err) => {
        console.error("Worker error:", err);
      };
    } catch (err) {
      console.error("Failed to initialize SyncWorker:", err);
    }
  }

  public async putBulk(storeName: string, items: unknown[]): Promise<WorkerResult | null> {
    if (!this.worker) {
      console.warn("SyncWorker not available, falling back to main thread.");
      return null;
    }

    const id = `req_${++this.requestIdCounter}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Update global activity spinner
      useStore.getState().incrementProcessing();

      const request: WorkerRequest = {
        type: "PUT_BULK",
        id,
        payload: { storeName, items },
      };

      this.worker?.postMessage(request);
    });
  }
}

export const workerBridge = new WorkerBridge();
