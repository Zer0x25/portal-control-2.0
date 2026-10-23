# Spec 037: responsive layout exceptions

The desktop/mobile implementations below remain separate because they present
different information density and controls. Their virtualizers keep distinct
row estimates so measured rows do not overlap.

| View           | Desktop geometry | Mobile geometry | Reason to keep both layouts                                                                           |
| -------------- | ---------------: | --------------: | ----------------------------------------------------------------------------------------------------- |
| Assignments    |            65 px |          160 px | Desktop has six table columns; mobile stacks assignment details and row actions.                      |
| Leave requests |            65 px |          160 px | Desktop columns prioritize approval scanning; mobile cards show period, reason, and actions together. |
| Shift patterns |            65 px |          120 px | Desktop scans schedule columns; mobile stacks the cycle, schedule, and actions.                       |
| Holidays       |            65 px |          110 px | Desktop uses a four-column grid; mobile combines date, type, name, and actions in a card.             |
| Time records   |            66 px |          280 px | Desktop is a dense table; mobile cards include schedule, correction status, and record actions.       |
| Audit logs     |            48 px |           90 px | Desktop uses a compact column row; mobile stacks event details for narrow containers.                 |

The mobile report cards remain split by report schema: daily cards include
clocking, schedule, justification, and subtotal data; summary cards group
scheduled/worked values and anomaly counts. `ReportTable` now chooses between
those cards and the desktop `DataTable` with container queries.

After rebasing onto `32f438f`, the audit-log screen uses the refactored
`governance/hooks/useAuditLogsController.ts` and
`governance/views/AuditLogsView.view.tsx` modules instead of the former
monolithic component. Its desktop 48 px rows and mobile 90 px cards retain
separate virtualized layouts.
