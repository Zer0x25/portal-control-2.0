import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  requestId?: string;
  username?: string;
  skipTrigger?: boolean;
  runtimeWork?: { id: string; run<T>(task: () => Promise<T>): Promise<T> };
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
