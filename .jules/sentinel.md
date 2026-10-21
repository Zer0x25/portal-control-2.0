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

## 2026-10-14 - Enforce JWT_SECRET Environment Variable without Fallback

**Vulnerability:** The `AuthService` class defined the `SECRET` using `process.env.JWT_SECRET || ""`, which allows an empty string as a valid fallback. This weakens cryptographic security and undermines production deployment safety by silently failing to enforce a strong secret.
**Learning:** Silent fallbacks to weak defaults (especially for environment variables like `JWT_SECRET`) undermine production security without developer awareness, making it easier to accidentally run vulnerable instances or forge tokens.
**Prevention:** Always implement a "fail-fast" pattern at application startup for critical environment variables. Throw an explicit Error (e.g., `throw new Error("CRITICAL: JWT_SECRET environment variable is not set.");`) rather than defaulting to an empty string.

## 2026-10-13 - Prevent SQL injection vulnerability by replacing $executeRawUnsafe with $executeRaw

**Vulnerability:** Use of $executeRawUnsafe allows string interpolation, which could potentially lead to a SQL injection if user input were ever interpolated into the string. It violates project agentic guardrails.
**Learning:** Prisma's $executeRaw automatically parameterizes values, defending against injection attacks.
**Prevention:** Replace instances of $executeRawUnsafe with the safe parameterizable tag $executeRaw in Prisma.

## 2026-10-21 - Reverse tabnabbing hardening for sanitized HTML

**Vulnerability:** Sanitized HTML (communications board, user manual modal) could carry `target="_blank"` anchors without a `rel` guard, leaving spawned tabs with `window.opener` access to the app (reverse tabnabbing).
**Learning:** DOMPurify sanitizes attributes but does not inject mitigation attributes by default; modern browsers apply implicit `noopener` to `target="_blank"`, but older engines require the explicit attribute (defense-in-depth).
**Action:** Centralized wrapper `frontend/src/utils/domPurify.ts` registers an `afterSanitizeAttributes` hook that sets `rel="noopener noreferrer"` on surviving `_blank` anchors; both importers (`UserManualModal`, `Communications.view`) share the singleton, so every sanitize pass is covered. Absorbed from agent draft PR #73 into commit `7e66c45` via PR #80.
