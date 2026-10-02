import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  username?: string;
  skipTrigger?: boolean;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
