const BUSINESS_HTTP_ERROR_STATUSES = new Set([400, 401, 403, 409]);

export const getHttpStatus = (args: readonly unknown[]): number | undefined => {
  for (const arg of args) {
    if (!arg || typeof arg !== "object") continue;
    if ("status" in arg && typeof arg.status === "number") return arg.status;

    if (
      "response" in arg &&
      arg.response &&
      typeof arg.response === "object" &&
      "status" in arg.response &&
      typeof arg.response.status === "number"
    ) {
      return arg.response.status;
    }
  }

  return undefined;
};

export const isHandledBusinessHttpError = (status: number | undefined): boolean =>
  status !== undefined && BUSINESS_HTTP_ERROR_STATUSES.has(status);
