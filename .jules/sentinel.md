## 2026-10-01 - Command Injection Prevention in System Utilities
**Vulnerability:** Shell string interpolation in `child_process.exec` (or `execAsync`) when running binaries like `pg_dump`, `docker`, or custom scripts allowed arbitrary command execution via unescaped arguments.
**Learning:** Shell interpreters process metacharacters (`;`, `|`, `&&`, `>`, `<`). Using string templates in `exec` is inherently unsafe.
**Action:** Always use `child_process.execFile` or `child_process.spawn` with an explicit argument array (`args: string[]`). For file redirection, use native Node.js file descriptors (`fs.openSync`) via `stdio` configurations instead of shell operators.

## 2026-10-01 - Parameterized PostgreSQL Settings for Audit Log
**Vulnerability:** Passing unescaped or concatenated strings to `$executeRawUnsafe` to configure `audit.username` allowed potential SQL injection.
**Learning:** Even with string escaping, string concatenation in raw SQL should be avoided in favor of native PostgreSQL parametrization.
**Action:** Use PostgreSQL's `set_config` function inside `$executeRaw`: `SELECT set_config('audit.username', ${username}, true)`.

## 2026-10-01 - Strict Environment Variable Enforcement for Cryptography
**Vulnerability:** A hardcoded fallback secret was used in `cryptoUtils.ts` if `JWT_SECRET` was undefined.
**Learning:** Silent fallbacks to weak defaults undermine production security without developer awareness.
**Action:** Fail fast and throw an explicit error on startup if cryptographic secrets or security credentials are missing.

## 2026-10-02 - Comprehensive Batch Period Lock Validation
**Vulnerability:** In `timeRecordController.createBulkRecords`, only the first 10 records (`slice(0, 10)`) were checked against `isRecordLocked`.
**Learning:** Partial slice validations permit bypasses if locked dates exist beyond the inspected window.
**Action:** Always extract all unique dates from the entire batch (`new Set(records.map(r => r.date))`) and validate 100% of the target dates before processing.

## 2026-10-11 - Punch Overwriting Full-Day Leave Rows + Future-Date Write Vectors
**Vulnerability:** `PunchService` treated a leave-materialized `TimeRecord` (Vacaciones/Permiso, no punches) as an open shift: first punch overwrote it to `Laborando`, second collided with `ACTION_ALREADY_TAKEN`. Separately, `save`/`bulk` accepted arbitrary future `date`, correction `datetime-local` had no max, and virtual `MISSING-<emp>-<date>` resolve could create future rows (punch itself always uses server date, so future rows never come from punch).
**Learning:** LeaveRecord (date range) is the source of truth for leave, not TimeRecord status; any writer accepting a business date must compare it against the Chile business date.
**Action:** Guard `ON_LEAVE` in punch (400, no row mutation), ignore other-day rows in the open-shift lookup, reject `date > businessDate(now)` in `save`/`bulk`/`resolve` + `CorrectionRequestSchema.refine` + service-level future guard, frontend `max` + controller block. See `.agents/rules/attendance-punch.md` and specs 030.
