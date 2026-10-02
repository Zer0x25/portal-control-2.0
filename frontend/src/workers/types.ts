/**
 * Common types for Web Worker communication.
 */

export type WorkerMessageType = "PUT_BULK" | "SUCCESS" | "ERROR";

export interface WorkerPayload {
  storeName: string;
  items: unknown[];
}

export interface WorkerRequest {
  type: WorkerMessageType;
  id: string;
  payload: WorkerPayload;
}

export interface WorkerResponse {
  type: WorkerMessageType;
  id: string;
  result?: WorkerResult;
  error?: string;
}

export interface WorkerResult {
  successCount: number;
  errorCount: number;
  total: number;
}
