# Spec 037: memoization audit

Measured on 2026-10-23 with the TypeScript AST scanner in
`frontend/scripts/audit-memoization.mjs`. The baseline is the clean remote main
at `32f438f29f7a96484efa7e400aa5a146d1772a41`; the final scan covers the
rebased spec worktree. Both scans use the same scanner and exclude tests.

| Call type     | Baseline | Final |     Removed |
| ------------- | -------: | ----: | ----------: |
| `useMemo`     |      183 |    38 |         145 |
| `useCallback` |      166 |    65 |         101 |
| `memo`        |       36 |    10 |          26 |
| Total         |      385 |   113 | 272 (70.6%) |

The scanner covers 630 production files in the baseline and 633 in the final
tree. A fresh Vite build log marked 74 of the remaining calls in files with
React Compiler bailout diagnostics. This is a file-level match, not a claim
that each call expression individually caused a bailout. The diagnostics
include TanStack Virtual's `useVirtualizer`, render-time ref access in
`useAppForm`, dynamic imports in query functions, captured loop updates in
`useShiftPatternForm`, and unsupported `try/finally` control flow in
`useWorkerPortalData`. Manual memoization remains in those modules where the
compiler skips optimization.

The other 39 sites have explicit reasons in source and fall into these groups:

- Date arithmetic and comparator semantics: `DatePicker.tsx` and
  `PageHeader.tsx`.
- Stable callback props or effect actions: `ToastItem.tsx`,
  `useEmailCenterController.ts`, `useDashboardModalController.ts`,
  `useImportPreview.ts`, `useAuditLogDownload.ts`,
  `useTimeControlModals.ts`, `useNotificationCenterController.ts`,
  `useIntegrityStatus.ts`, `useShiftAssignmentForm.ts`, and
  `AmbientReminderManager.tsx`.
- Cached paginated rows, lookup data, and KPI calculations:
  `IntegritySummaryView.tsx`, `useMeterHistoryController.ts`, and
  `useTimeControl.ts`.
- Virtualized audit and time-record row boundaries:
  `AuditLogsView.view.tsx`, `ClockingPanel.tsx`, `TimeRecordMobileCard.tsx`,
  `TimeRecordRow.tsx`, `TimeRecordTable.tsx`,
  `TimeRecordTableViewDesktop.tsx`, and `TimeRecordTableViewMobile.tsx`.

All five critical-route profiler comparisons remain in `render-after.json`;
each route has `passed: true` and no route exceeds its baseline render count.
