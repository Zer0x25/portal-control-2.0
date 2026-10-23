import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { refreshActiveQueriesForSync } from "../../lib/querySync";

describe("refresco de consultas al inicializar", () => {
  let client: QueryClient;
  let unsubscribe: (() => void) | undefined;

  afterEach(() => {
    unsubscribe?.();
    unsubscribe = undefined;
    client?.clear();
  });

  const mountActiveQuery = (queryFn: () => Promise<string>) => {
    const observer = new QueryObserver(client, {
      queryKey: ["employees"],
      queryFn,
      staleTime: 5 * 60 * 1000,
    });
    unsubscribe = observer.subscribe(() => undefined);
    return observer;
  };

  const createClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  it("no vuelve a descargar una consulta activa todavía fresca", async () => {
    client = createClient();
    const queryFn = vi.fn().mockResolvedValue("fresh");
    const observer = mountActiveQuery(queryFn);
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe("fresh"));
    queryFn.mockClear();

    await refreshActiveQueriesForSync(client, ["employees"]);

    expect(queryFn).not.toHaveBeenCalled();
  });

  it("refresca una sola vez una consulta activa que fue invalidada", async () => {
    client = createClient();
    const queryFn = vi.fn().mockResolvedValue("fresh");
    const observer = mountActiveQuery(queryFn);
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe("fresh"));
    queryFn.mockClear();
    await client.invalidateQueries({ queryKey: ["employees"], refetchType: "none" });

    await refreshActiveQueriesForSync(client, ["employees"]);

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("se une a un fetch inicial en curso sin cancelarlo ni duplicarlo", async () => {
    client = createClient();
    let resolveFetch: ((value: string) => void) | undefined;
    const queryFn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    mountActiveQuery(queryFn);
    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

    const refresh = refreshActiveQueriesForSync(client, ["employees"]);
    resolveFetch?.("loaded");
    await refresh;

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("fuerza el refresco cuando el servidor informa otra instancia", async () => {
    client = createClient();
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce("old-instance")
      .mockResolvedValueOnce("new-instance");
    const observer = mountActiveQuery(queryFn);
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe("old-instance"));
    queryFn.mockClear();

    await refreshActiveQueriesForSync(client, ["employees"], true);

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().data).toBe("new-instance");
  });
});
