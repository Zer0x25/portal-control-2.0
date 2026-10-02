import type { Router } from "express";
import { isValidateMiddleware } from "../../src/middleware/validate";

/**
 * Express 5 removed `layer.regexp` and leaves `layer.path` undefined for
 * mounted routers, so walking `app.router.stack` can no longer recover mount
 * prefixes. `src/app.ts` therefore exports `ROUTE_MOUNTS`, and this module pairs
 * each prefix with the routes actually registered on that router.
 *
 * `validate(...)` returns anonymous arrow functions, so detection relies on the
 * explicit marker attached in `src/middleware/validate.ts` rather than on
 * `fn.name`, which is unreliable for anonymous middleware.
 */

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack?: { handle?: unknown }[];
  };
  handle?: { stack?: RouteLayer[] };
  name?: string;
}

export interface RegisteredRoute {
  path: string;
  methods: string[];
  hasValidate: boolean;
}

const stackOf = (router: Router): RouteLayer[] =>
  (router as unknown as { stack?: RouteLayer[] }).stack ?? [];

/** Routes registered directly on a router, ignoring nested sub-routers. */
export const routesOf = (router: Router): RegisteredRoute[] => {
  const routes: RegisteredRoute[] = [];

  for (const layer of stackOf(router)) {
    if (!layer.route) continue;

    const methods = Object.entries(layer.route.methods)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method.toUpperCase())
      .sort();

    const hasValidate = (layer.route.stack ?? []).some((handler) =>
      isValidateMiddleware(handler?.handle),
    );

    routes.push({ path: layer.route.path, methods, hasValidate });
  }

  return routes;
};

export const normalizePath = (rawPath: string): string => {
  const collapsed = rawPath.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
};

/** Express `:param` syntax -> Swagger `{param}` syntax. */
export const toSwaggerPath = (routePath: string): string => routePath.replace(/:(\w+)/g, "{$1}");

export interface MountedRoute extends RegisteredRoute {
  prefix: string;
  fullPath: string;
}

/** Joins mount prefixes with each router's own routes, mirroring what Express serves. */
export const collectRoutes = (
  mounts: ReadonlyArray<{ prefix: string; router: Router }>,
): MountedRoute[] =>
  mounts.flatMap(({ prefix, router }) =>
    routesOf(router).map((route) => ({
      ...route,
      prefix,
      fullPath: normalizePath(`${prefix}${route.path}`),
    })),
  );

/**
 * Walks nested routers (e.g. a sub-router mounted inside another router) so
 * nested route surfaces are covered too.
 */
export const collectRoutesDeep = (
  mounts: ReadonlyArray<{ prefix: string; router: Router }>,
): MountedRoute[] => {
  const collected: MountedRoute[] = [];

  const walk = (prefix: string, router: Router): void => {
    for (const layer of stackOf(router)) {
      if (layer.route) {
        const methods = Object.entries(layer.route.methods)
          .filter(([, enabled]) => enabled)
          .map(([method]) => method.toUpperCase())
          .sort();

        collected.push({
          prefix,
          path: layer.route.path,
          methods,
          hasValidate: (layer.route.stack ?? []).some((handler) =>
            isValidateMiddleware(handler?.handle),
          ),
          fullPath: normalizePath(`${prefix}${layer.route.path}`),
        });
        continue;
      }

      if (layer.name === "router" && layer.handle?.stack) {
        walk(prefix, layer.handle as unknown as Router);
      }
    }
  };

  for (const { prefix, router } of mounts) walk(prefix, router);
  return collected;
};
