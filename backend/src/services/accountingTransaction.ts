// Closure validation may span years; waiters use the same bounded budget.
export const ACCOUNTING_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 120_000 } as const;
