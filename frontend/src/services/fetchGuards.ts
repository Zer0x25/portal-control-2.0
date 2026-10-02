type RateLimitedDetail = {
  status: number;
  url: string;
  retryAfter?: string | null;
};

declare global {
  interface Window {
    __fetchGuardInstalled?: boolean;
    __rateLimitEventLock?: boolean;
  }
}

export function installFetchGuards() {
  if (window.__fetchGuardInstalled) return;
  window.__fetchGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);

    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isLoginEndpoint = /\/auth\/login(?:\?|$)/.test(url);

    if (response.status === 429 && !isLoginEndpoint && !window.__rateLimitEventLock) {
      window.__rateLimitEventLock = true;

      const detail: RateLimitedDetail = {
        status: response.status,
        url,
        retryAfter: response.headers.get("Retry-After"),
      };

      window.dispatchEvent(new CustomEvent("rate_limited", { detail }));

      // Prevent event storms when many concurrent requests fail.
      setTimeout(() => {
        window.__rateLimitEventLock = false;
      }, 5000);
    }

    return response;
  };
}
